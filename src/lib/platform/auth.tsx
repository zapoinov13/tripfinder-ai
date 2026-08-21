import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { rolePermissions, type Role } from "@/lib/platform-contracts";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { hydrateUserDataFromSupabase } from "@/lib/supabase/hydrate";
import { startPlatformSync } from "@/lib/supabase/sync";
import { appendAudit, pushNotification, trackEvent } from "./catalog";
import { usePlatformStore } from "./hooks";
import { DEMO_PASSWORD } from "./seed";
import { getState, nowIso, setState, uid } from "./store";
import type { Organization, PlatformUser } from "./types";

type AuthResult = { ok: boolean; error?: string };

type AuthCtx = {
  user: PlatformUser | null;
  organization: Organization | null;
  isAuthenticated: boolean;
  isPremium: boolean;
  supabaseEnabled: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  registerTourist: (input: {
    name: string;
    email: string;
    city: string;
    password?: string;
  }) => Promise<AuthResult>;
  registerOperator: (input: {
    name: string;
    email: string;
    password?: string;
    company: Omit<
      Organization,
      | "id"
      | "status"
      | "planCode"
      | "additionalTourLimit"
      | "advertisingBalance"
      | "promotionBalance"
      | "createdAt"
    >;
  }) => Promise<AuthResult>;
  hasRole: (...roles: Role[]) => boolean;
  hasPermission: (permission: string) => boolean;
  purchasePremium: () => Promise<AuthResult>;
};

const AuthContext = createContext<AuthCtx | null>(null);
const SUPABASE_BOOTSTRAP_TIMEOUT_MS = 2500;

function upsertLocalUser(profile: {
  id: string;
  email: string;
  name: string;
  city: string;
  role: Role;
  status?: PlatformUser["status"];
  organization_id?: string | null;
}) {
  const user: PlatformUser = {
    id: profile.id,
    email: profile.email,
    password: "",
    name: profile.name,
    city: profile.city,
    role: profile.role,
    status: profile.status ?? "active",
    ...(profile.organization_id ? { organizationId: profile.organization_id } : {}),
    createdAt: nowIso(),
  };
  setState(
    (s) => ({
      ...s,
      users: [...s.users.filter((u) => u.id !== user.id && u.email !== user.email), user],
      session: { userId: user.id, createdAt: nowIso() },
    }),
    { silent: true },
  );
  return user;
}

async function fetchProfile(userId: string) {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) {
    console.warn("[supabase] profile", error.message);
    return null;
  }
  return data as {
    id: string;
    email: string;
    name: string;
    city: string;
    role: Role;
    status: PlatformUser["status"];
    organization_id: string | null;
  } | null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const state = usePlatformStore();
  const [bootstrapping, setBootstrapping] = useState(isSupabaseConfigured);
  const user = state.session
    ? (state.users.find((u) => u.id === state.session!.userId) ?? null)
    : null;
  const organization = user?.organizationId
    ? (state.organizations.find((o) => o.id === user.organizationId) ?? null)
    : null;

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setBootstrapping(false);
      return;
    }

    startPlatformSync();

    let mounted = true;
    let bootstrapped = false;
    const finishBootstrap = () => {
      if (!mounted || bootstrapped) return;
      bootstrapped = true;
      setBootstrapping(false);
    };
    const bootstrapTimeout = window.setTimeout(() => {
      console.warn("[supabase] auth bootstrap timed out, continuing with local catalog");
      finishBootstrap();
    }, SUPABASE_BOOTSTRAP_TIMEOUT_MS);

    const syncSession = async (userId: string | undefined) => {
      if (!userId) {
        setState((s) => ({ ...s, session: null }), { silent: true });
        return;
      }
      const profile = await fetchProfile(userId);
      if (!mounted) return;
      if (profile) {
        upsertLocalUser(profile);
        void hydrateUserDataFromSupabase(userId).then((res) => {
          if (res.ok) console.info("[supabase] данные пользователя загружены", res);
        });
      } else {
        // profile trigger may lag: keep auth uid session with email from auth
        const { data } = await sb.auth.getUser();
        if (data.user) {
          upsertLocalUser({
            id: data.user.id,
            email: data.user.email ?? "",
            name: String(data.user.user_metadata?.["name"] ?? "Пользователь"),
            city: String(data.user.user_metadata?.["city"] ?? "Алматы"),
            role: String(data.user.app_metadata?.["role"] ?? "TOURIST") as Role,
            organization_id: null,
          });
        }
      }
    };

    sb.auth.getSession().then(({ data }) => {
      void syncSession(data.session?.user.id).finally(() => {
        window.clearTimeout(bootstrapTimeout);
        finishBootstrap();
      });
    });

    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      void syncSession(session?.user.id);
    });

    return () => {
      mounted = false;
      window.clearTimeout(bootstrapTimeout);
      sub.subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const sb = getSupabase();
    if (sb) {
      const { data, error } = await sb.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error || !data.user) {
        const local = getState().users.find(
          (u) => u.email.toLowerCase() === email.trim().toLowerCase(),
        );
        if (local && local.password === password && local.status !== "suspended") {
          setState((s) => ({
            ...s,
            session: { userId: local.id, createdAt: nowIso() },
          }));
          appendAudit({
            actorId: local.id,
            action: "login",
            entityType: "user",
            entityId: local.id,
          });
          trackEvent("LOGIN", local.id);
          toast.success(`С возвращением, ${local.name}`);
          return { ok: true };
        }
        return { ok: false, error: error?.message ?? "Неверный email или пароль" };
      }
      const profile = await fetchProfile(data.user.id);
      if (profile?.status === "suspended") {
        await sb.auth.signOut();
        return { ok: false, error: "Аккаунт приостановлен" };
      }
      if (profile) upsertLocalUser(profile);
      appendAudit({
        actorId: data.user.id,
        action: "login",
        entityType: "user",
        entityId: data.user.id,
      });
      trackEvent("LOGIN", data.user.id);
      toast.success("Вход через Supabase");
      return { ok: true };
    }

    const found = getState().users.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase(),
    );
    if (!found || found.password !== password) {
      return { ok: false, error: "Неверный email или пароль" };
    }
    if (found.status === "suspended") {
      return { ok: false, error: "Аккаунт приостановлен" };
    }
    setState((s) => ({
      ...s,
      session: { userId: found.id, createdAt: nowIso() },
    }));
    appendAudit({
      actorId: found.id,
      action: "login",
      entityType: "user",
      entityId: found.id,
    });
    trackEvent("LOGIN", found.id);
    toast.success(`С возвращением, ${found.name}`);
    return { ok: true };
  }, []);

  const logout = useCallback(async () => {
    const current = getState().session?.userId;
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
    if (current) {
      appendAudit({
        actorId: current,
        action: "logout",
        entityType: "user",
        entityId: current,
      });
    }
    setState((s) => ({ ...s, session: null }));
    toast("Вы вышли из аккаунта");
  }, []);

  const registerTourist = useCallback(
    async (input: {
      name: string;
      email: string;
      city: string;
      password?: string;
    }): Promise<AuthResult> => {
      const email = input.email.trim().toLowerCase();
      if (!email || !input.name.trim()) return { ok: false, error: "Заполните имя и email" };
      const password = input.password || DEMO_PASSWORD;
      const sb = getSupabase();
      if (sb) {
        const { data, error } = await sb.auth.signUp({
          email,
          password,
          options: {
            data: { name: input.name.trim(), city: input.city.trim() || "Алматы" },
          },
        });
        if (error || !data.user) {
          return { ok: false, error: error?.message ?? "Ошибка регистрации" };
        }
        await sb.from("profiles").upsert({
          id: data.user.id,
          email,
          name: input.name.trim(),
          city: input.city.trim() || "Алматы",
          role: "TOURIST",
          status: "active",
        });
        upsertLocalUser({
          id: data.user.id,
          email,
          name: input.name.trim(),
          city: input.city.trim() || "Алматы",
          role: "TOURIST",
        });
        toast.success("Аккаунт создан в Supabase");
        return { ok: true };
      }

      if (getState().users.some((u) => u.email === email)) {
        return { ok: false, error: "Email уже зарегистрирован" };
      }
      const user: PlatformUser = {
        id: uid(),
        email,
        password,
        name: input.name.trim(),
        city: input.city.trim() || "Алматы",
        role: "TOURIST",
        status: "active",
        createdAt: nowIso(),
      };
      setState((s) => ({
        ...s,
        users: [...s.users, user],
        session: { userId: user.id, createdAt: nowIso() },
      }));
      toast.success("Аккаунт туриста создан (local)");
      return { ok: true };
    },
    [],
  );

  const registerOperator = useCallback(
    async (input: {
      name: string;
      email: string;
      password?: string;
      company: Omit<
        Organization,
        | "id"
        | "status"
        | "planCode"
        | "additionalTourLimit"
        | "advertisingBalance"
        | "promotionBalance"
        | "createdAt"
      >;
    }): Promise<AuthResult> => {
      const email = input.email.trim().toLowerCase();
      if (!email || !input.company.name.trim()) {
        return { ok: false, error: "Заполните компанию и email" };
      }
      const password = input.password || DEMO_PASSWORD;
      const sb = getSupabase();
      if (sb) {
        const { data, error } = await sb.auth.signUp({
          email,
          password,
          options: {
            data: { name: input.name.trim() || input.company.contactPerson },
          },
        });
        if (error || !data.user) {
          return { ok: false, error: error?.message ?? "Ошибка регистрации" };
        }
        const { data: org, error: orgErr } = await sb
          .from("organizations")
          .insert({
            name: input.company.name,
            legal_name: input.company.legalName,
            registration_number: input.company.registrationNumber,
            country: input.company.country,
            city: input.company.city,
            address: input.company.address,
            phone: input.company.phone,
            email: input.company.email || email,
            website: input.company.website,
            contact_person: input.company.contactPerson,
            status: "PENDING_APPROVAL",
            plan_code: "START",
          })
          .select("*")
          .single();
        if (orgErr || !org) {
          return { ok: false, error: orgErr?.message ?? "Не удалось создать организацию" };
        }
        await sb.from("profiles").upsert({
          id: data.user.id,
          email,
          name: input.name.trim() || input.company.contactPerson || "Поставщик",
          city: input.company.city || "Алматы",
          role: "OPERATOR_ADMIN",
          organization_id: org.id,
          status: "active",
        });
        await sb.from("organization_members").insert({
          organization_id: org.id,
          user_id: data.user.id,
          role: "OPERATOR_ADMIN",
        });
        setState((s) => ({
          ...s,
          organizations: [
            ...s.organizations,
            {
              id: org.id,
              name: org.name,
              legalName: org.legal_name,
              registrationNumber: org.registration_number,
              country: org.country,
              city: org.city,
              address: org.address,
              phone: org.phone,
              email: org.email,
              website: org.website,
              contactPerson: org.contact_person,
              status: org.status,
              planCode: org.plan_code,
              additionalTourLimit: org.additional_tour_limit,
              advertisingBalance: Number(org.advertising_balance),
              promotionBalance: Number(org.promotion_balance),
              createdAt: org.created_at,
            },
          ],
        }));
        upsertLocalUser({
          id: data.user.id,
          email,
          name: input.name.trim() || input.company.contactPerson || "Поставщик",
          city: input.company.city || "Алматы",
          role: "OPERATOR_ADMIN",
          organization_id: org.id,
        });
        toast.success("Заявка отправлена (Supabase): PENDING_APPROVAL");
        return { ok: true };
      }

      // local fallback (existing)
      if (getState().users.some((u) => u.email === email)) {
        return { ok: false, error: "Email уже зарегистрирован" };
      }
      const orgId = uid();
      const userId = uid();
      const org: Organization = {
        ...input.company,
        id: orgId,
        email: input.company.email || email,
        status: "PENDING_APPROVAL",
        planCode: "START",
        additionalTourLimit: 0,
        advertisingBalance: 0,
        promotionBalance: 0,
        createdAt: nowIso(),
      };
      const user: PlatformUser = {
        id: userId,
        email,
        password,
        name: input.name.trim() || input.company.contactPerson || "Поставщик",
        city: input.company.city || "Алматы",
        role: "OPERATOR_ADMIN",
        status: "active",
        organizationId: orgId,
        createdAt: nowIso(),
      };
      setState((s) => ({
        ...s,
        organizations: [...s.organizations, org],
        users: [...s.users, user],
        members: [
          ...s.members,
          { id: uid(), organizationId: orgId, userId, role: "OPERATOR_ADMIN" },
        ],
        session: { userId, createdAt: nowIso() },
      }));
      toast.success("Заявка отправлена. Статус: PENDING_APPROVAL");
      return { ok: true };
    },
    [],
  );

  const purchasePremium = useCallback(async (): Promise<AuthResult> => {
    const current = getState().session?.userId;
    if (!current) return { ok: false, error: "Войдите в аккаунт" };
    const config = getState().config;
    const sb = getSupabase();

    setState((s) => ({
      ...s,
      users: s.users.map((u) =>
        u.id === current ? { ...u, role: "PREMIUM_TOURIST" as const } : u,
      ),
      payments: [
        {
          id: uid(),
          userId: current,
          amount: config.premiumMonthlyPrice,
          currency: config.premiumCurrency,
          type: "premium_subscription",
          provider: "mock",
          providerPaymentId: uid(),
          status: "paid",
          createdAt: nowIso(),
        },
        ...s.payments,
      ],
      subscriptions: [
        {
          id: uid(),
          userId: current,
          planId: "premium-monthly",
          status: "active",
          startedAt: nowIso(),
          expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
          autoRenew: true,
        },
        ...s.subscriptions.filter((sub) => sub.userId !== current),
      ],
    }));

    if (sb) {
      await sb.from("profiles").update({ role: "PREMIUM_TOURIST" }).eq("id", current);
      await sb.from("subscriptions").insert({
        user_id: current,
        plan_id: "premium-monthly",
        status: "active",
        started_at: nowIso(),
        expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
        auto_renew: true,
      });
      await sb.from("payments").insert({
        user_id: current,
        amount: config.premiumMonthlyPrice,
        currency: config.premiumCurrency,
        type: "premium_subscription",
        provider: "mock",
        provider_payment_id: uid(),
        status: "paid",
      });
    }

    pushNotification(
      current,
      "premium_deal",
      "Premium активирован",
      "Эксклюзивные предложения открыты.",
    );
    trackEvent("PREMIUM_PURCHASED", current);
    toast.success("Premium подписка активна");
    return { ok: true };
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      organization,
      isAuthenticated: Boolean(user),
      isPremium: user?.role === "PREMIUM_TOURIST",
      supabaseEnabled: isSupabaseConfigured,
      login,
      logout,
      registerTourist,
      registerOperator,
      purchasePremium,
      hasRole: (...roles) => (user ? roles.includes(user.role) : false),
      hasPermission: (permission) => {
        if (!user) return false;
        const perms = rolePermissions[user.role] ?? [];
        return perms.includes("admin:all") || perms.includes(permission);
      },
    }),
    [user, organization, login, logout, registerTourist, registerOperator, purchasePremium],
  );

  if (bootstrapping) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        Подключение к Supabase…
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function requireAuthRedirect(roles?: Role[]) {
  const s = getState();
  const user = s.session ? s.users.find((u) => u.id === s.session!.userId) : null;
  if (!user) return "/login";
  if (user.status === "suspended") return "/login";
  if (roles && !roles.includes(user.role)) {
    if (user.role === "PLATFORM_ADMIN" || user.role === "PLATFORM_MANAGER") return "/admin";
    if (user.role === "OPERATOR_ADMIN" || user.role === "OPERATOR_MANAGER") return "/operator";
    return "/profile";
  }
  return null;
}

export function useRequireAuth(roles?: Role[]) {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  /** До гидрации стор отдаёт сид без сессии, редиректить по нему нельзя. */
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  if (typeof window === "undefined" || !hydrated) return { allowed: false, user: null };
  if (!isAuthenticated || !user) {
    queueMicrotask(() => navigate({ to: "/login" }));
    return { allowed: false, user: null };
  }
  if (roles && !roles.includes(user.role)) {
    const to = user.role.startsWith("PLATFORM")
      ? "/admin"
      : user.role.startsWith("OPERATOR")
        ? "/operator"
        : "/profile";
    queueMicrotask(() => navigate({ to }));
    return { allowed: false, user };
  }
  return { allowed: true, user };
}
