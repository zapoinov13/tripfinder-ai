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

import { AppSplash } from "@/components/site/app-splash";
import { authorizeAppleSignIn, type AppleAuthResult } from "@/lib/native/apple-auth";
import { rolePermissions, type Role } from "@/lib/platform-contracts";
import { getSupabase, getSupabasePublicConfig, isSupabaseConfigured } from "@/lib/supabase/client";
import { hydrateUserDataFromSupabase } from "@/lib/supabase/hydrate";
import { startPlatformSync } from "@/lib/supabase/sync";
import { appendAudit, pushNotification, trackEvent } from "./catalog";
import { usePlatformStore } from "./hooks";
import { DEMO_PASSWORD } from "./seed";
import { getState, nowIso, setState, uid } from "./store";
import type { Organization, PlatformUser } from "./types";
import { humanAuthError } from "./auth-errors";

type AuthResult = { ok: boolean; error?: string };

type AuthCtx = {
  user: PlatformUser | null;
  organization: Organization | null;
  isAuthenticated: boolean;
  isPremium: boolean;
  supabaseEnabled: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  loginWithApple: (auth?: AppleAuthResult) => Promise<AuthResult>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<AuthResult>;
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
  registerCompanyForCurrentUser: (company: CompanyInput) => Promise<AuthResult>;
  hasRole: (...roles: Role[]) => boolean;
  hasPermission: (permission: string) => boolean;
  purchasePremium: () => Promise<AuthResult>;
};

const AuthContext = createContext<AuthCtx | null>(null);
/** Минимум, чтобы splash не мигал; максимум не держим экран дольше. */
const SPLASH_MIN_MS = 350;
const SPLASH_MAX_MS = 900;
const AUTH_SESSION_TIMEOUT_MS = 1200;

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

type CompanyInput = Omit<
  Organization,
  | "id"
  | "status"
  | "planCode"
  | "additionalTourLimit"
  | "advertisingBalance"
  | "promotionBalance"
  | "createdAt"
>;

type OrgRpcRow = {
  id: string;
  name: string;
  legal_name: string;
  registration_number: string;
  country: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  contact_person: string;
  status: Organization["status"];
  plan_code: Organization["planCode"];
  additional_tour_limit: number;
  advertising_balance: number;
  promotion_balance: number;
  created_at: string;
  category: string | null;
  services: string[] | null;
};

/** Организация + профиль + членство одной серверной функцией (см. миграцию). */
async function callRegisterCompanyRpc(
  sb: NonNullable<ReturnType<typeof getSupabase>>,
  company: CompanyInput,
  fallbackEmail: string,
): Promise<{ org: OrgRpcRow | null; error: string | null }> {
  // bind обязателен: supabase-js внутри rpc обращается к this.rest, а метод,
  // положенный в переменную, теряет объект — и падает с «Cannot read
  // properties of undefined (reading 'rest')». Именно из-за этого компания не
  // создавалась ни разу: аккаунт заводился, а следующий шаг умирал молча.
  const rpc = sb.rpc.bind(sb) as unknown as (
    fn: "register_company",
    args: Record<string, string>,
  ) => PromiseLike<{ data: OrgRpcRow | null; error: { message: string } | null }>;
  const { data, error } = await rpc("register_company", {
    p_name: company.name,
    p_legal_name: company.legalName,
    p_registration_number: company.registrationNumber,
    p_country: company.country,
    p_city: company.city,
    p_address: company.address,
    p_phone: company.phone,
    p_email: company.email || fallbackEmail,
    p_website: company.website,
    p_contact_person: company.contactPerson,
    // Категория едет тем же вызовом: компания без неё попадает в кабинет,
    // который не знает, что ей показывать.
    ...(company.category ? { p_category: company.category } : {}),
  });
  return { org: data, error: error?.message ?? null };
}

function orgRowToLocal(org: OrgRpcRow): Organization {
  return {
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
    // Категорию нельзя терять при переносе строки из базы: кабинет решает по
    // ней, какие разделы показывать. Без неё человек, зарегистрировавшийся как
    // спортзал, попадал в кабинет турфирмы — с турами, бронями и заявками,
    // которых у него не бывает. Полная гидрация приносила её позже, но первый
    // и самый важный экран человек видел уже неправильным.
    ...(org.category ? { category: org.category } : {}),
    ...(org.services ? { services: org.services } : {}),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const state = usePlatformStore();
  const [splashVisible, setSplashVisible] = useState(isSupabaseConfigured);
  const [splashFading, setSplashFading] = useState(false);
  const user = state.session
    ? (state.users.find((u) => u.id === state.session!.userId) ?? null)
    : null;
  const organization = user?.organizationId
    ? (state.organizations.find((o) => o.id === user.organizationId) ?? null)
    : null;

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;

    startPlatformSync();

    let mounted = true;
    let dismissed = false;
    const splashStart = Date.now();

    const dismissSplash = () => {
      if (!mounted || dismissed) return;
      dismissed = true;
      const wait = Math.max(0, SPLASH_MIN_MS - (Date.now() - splashStart));
      window.setTimeout(() => {
        if (!mounted) return;
        setSplashFading(true);
        window.setTimeout(() => {
          if (mounted) setSplashVisible(false);
        }, 450);
      }, wait);
    };

    const splashTimeout = window.setTimeout(() => {
      console.warn("[supabase] session check slow, showing app with local catalog");
      dismissSplash();
    }, SPLASH_MAX_MS);

    const syncSession = async (userId: string | undefined) => {
      if (!userId) {
        setState((s) => ({ ...s, session: null }), { silent: true });
        return;
      }
      const profile = await fetchProfile(userId);
      if (!mounted) return;
      if (profile) {
        upsertLocalUser(profile);
        void import("@/lib/native/push").then((m) => m.linkPushTokenToCurrentUser());
        void hydrateUserDataFromSupabase(userId).then((res) => {
          if (res.ok) console.info("[supabase] данные пользователя загружены", res);
        });
      } else {
        // profile trigger may lag: keep auth uid session with email from auth
        const { data } = await sb.auth.getUser();
        if (data.user) {
          // Если локальный пользователь уже создан (например, регистрация
          // оператора ещё пишет организацию), не затираем его роль дефолтом.
          const existing = getState().users.find((u) => u.id === data.user!.id);
          if (existing) {
            setState((s) => ({ ...s, session: { userId: existing.id, createdAt: nowIso() } }), {
              silent: true,
            });
            return;
          }
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

    const sessionPromise = Promise.race([
      sb.auth.getSession(),
      new Promise<Awaited<ReturnType<typeof sb.auth.getSession>>>((resolve) => {
        window.setTimeout(
          () => resolve({ data: { session: null }, error: null }),
          AUTH_SESSION_TIMEOUT_MS,
        );
      }),
    ]);

    void sessionPromise.then(({ data }) => {
      window.clearTimeout(splashTimeout);
      dismissSplash();
      void syncSession(data.session?.user.id);
    });

    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      void syncSession(session?.user.id);
    });

    return () => {
      mounted = false;
      window.clearTimeout(splashTimeout);
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
        if (!import.meta.env.DEV) {
          return { ok: false, error: humanAuthError(error?.message, "Неверный email или пароль") };
        }
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
        return { ok: false, error: humanAuthError(error?.message, "Неверный email или пароль") };
      }
      const profile = await fetchProfile(data.user.id);
      if (profile?.status === "suspended") {
        await sb.auth.signOut();
        return { ok: false, error: "Аккаунт приостановлен" };
      }
      if ((profile?.status as string) === "deleted") {
        await sb.auth.signOut();
        return { ok: false, error: "Аккаунт удалён" };
      }
      if (profile) upsertLocalUser(profile);
      else {
        // profile trigger may lag. keep session with auth metadata
        upsertLocalUser({
          id: data.user.id,
          email: data.user.email ?? email.trim().toLowerCase(),
          name: String(data.user.user_metadata?.["name"] ?? "Пользователь"),
          city: String(data.user.user_metadata?.["city"] ?? "Алматы"),
          role: String(data.user.app_metadata?.["role"] ?? "TOURIST") as Role,
          organization_id: null,
        });
      }
      void import("@/lib/native/push").then((m) => m.linkPushTokenToCurrentUser());
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

    if (!sb) {
      if (!import.meta.env.DEV) {
        return { ok: false, error: "Вход временно недоступен. Попробуйте позже." };
      }
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

  const loginWithApple = useCallback(async (auth?: AppleAuthResult): Promise<AuthResult> => {
    const sb = getSupabase();
    const flow = auth ?? (await authorizeAppleSignIn());

    if (flow.mode === "oauth") {
      if (!sb) {
        return {
          ok: false,
          error:
            "Apple Sign-In доступен после подключения Supabase OAuth (Authentication → Apple).",
        };
      }
      const redirectTo = `${window.location.origin}/profile`;
      const { error } = await sb.auth.signInWithOAuth({
        provider: "apple",
        options: { redirectTo },
      });
      if (error) return { ok: false, error: humanAuthError(error.message, "Не удалось войти") };
      return { ok: true };
    }

    if (!sb) {
      return { ok: false, error: "Supabase не настроен для Apple Sign-In." };
    }

    const { data, error } = await sb.auth.signInWithIdToken({
      provider: "apple",
      token: flow.idToken,
    });
    if (error || !data.user) {
      return { ok: false, error: humanAuthError(error?.message, "Не удалось войти через Apple") };
    }

    const profile = await fetchProfile(data.user.id);
    if (profile) {
      upsertLocalUser(profile);
    } else {
      upsertLocalUser({
        id: data.user.id,
        email: flow.email ?? data.user.email ?? "apple@tourgo.app",
        name: flow.givenName?.trim() || "Apple User",
        city: "Алматы",
        role: "TOURIST",
        status: "active",
      });
    }

    trackEvent("LOGIN", data.user.id);
    toast.success("Вход через Apple");
    return { ok: true };
  }, []);

  const deleteAccount = useCallback(async (): Promise<AuthResult> => {
    const current = getState().session?.userId;
    if (!current) return { ok: false, error: "Вы не авторизованы" };

    const sb = getSupabase();
    if (sb) {
      const {
        data: { session },
      } = await sb.auth.getSession();

      let remoteDeleted = false;
      if (session?.access_token) {
        const { url: baseUrl, publishableKey: apiKey } = getSupabasePublicConfig();
        if (baseUrl && apiKey) {
          try {
            const res = await fetch(`${baseUrl}/functions/v1/delete-account`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${session.access_token}`,
                apikey: apiKey,
              },
            });
            if (res.ok) {
              remoteDeleted = true;
            }
          } catch {
            // Edge Function may not be deployed yet. fallback below
          }
        }
      }

      if (!remoteDeleted) {
        await sb.from("profiles").update({ status: "deleted" }).eq("id", current);
      }
      // Всегда чистим токены: после удаления на сервере getSession не должен
      // воскрешать сессию удалённого пользователя при следующем запуске.
      await sb.auth.signOut();
    }

    setState((s) => ({
      ...s,
      users: s.users.map((u) =>
        u.id === current
          ? { ...u, status: "suspended" as const, email: `deleted+${u.id}@tourgo.app` }
          : u,
      ),
      session: null,
    }));

    appendAudit({
      actorId: current,
      action: "delete_account",
      entityType: "user",
      entityId: current,
    });
    toast.success("Аккаунт удалён");
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
          return {
            ok: false,
            error: humanAuthError(error?.message, "Не удалось зарегистрироваться"),
          };
        }
        // При включённом подтверждении email signUp не даёт сессию: анонимный
        // upsert профиля срежет RLS, а локальная «сессия» будет фиктивной.
        if (!data.session) {
          const { data: signIn } = await sb.auth.signInWithPassword({ email, password });
          if (!signIn.session) {
            return {
              ok: false,
              error: "Подтвердите email по ссылке из письма, затем войдите.",
            };
          }
        }
        const { error: profileErr } = await sb.from("profiles").upsert({
          id: data.user.id,
          email,
          name: input.name.trim(),
          city: input.city.trim() || "Алматы",
          role: "TOURIST",
          status: "active",
        });
        if (profileErr) console.warn("[supabase] profiles.upsert", profileErr.message);
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

  /** Создаёт компанию для УЖЕ залогиненного пользователя (без signUp). */
  const registerCompanyForCurrentUser = useCallback(
    async (company: CompanyInput): Promise<AuthResult> => {
      const sb = getSupabase();
      if (!sb) return { ok: false, error: "Supabase не настроен" };
      const { data: sessionData } = await sb.auth.getSession();
      const sessionUser = sessionData.session?.user;
      if (!sessionUser) return { ok: false, error: "CONFIRM_EMAIL" };

      const { org, error } = await callRegisterCompanyRpc(sb, company, sessionUser.email ?? "");
      if (error || !org) {
        return {
          ok: false,
          error:
            error === "platform_admin_cannot_own_company"
              ? "Этим аккаунтом нельзя завести компанию: он администратор платформы. Зарегистрируйте компанию на отдельную почту — иначе вы потеряете доступ к админке."
              : error === "already_in_organization"
                ? "У этого аккаунта уже есть компания"
                : (error ?? "Не удалось создать организацию"),
        };
      }
      setState((s) => ({
        ...s,
        organizations: [...s.organizations, orgRowToLocal(org)],
      }));
      upsertLocalUser({
        id: sessionUser.id,
        email: sessionUser.email ?? "",
        name: company.contactPerson || "Поставщик",
        city: company.city || "Алматы",
        role: "OPERATOR_ADMIN",
        organization_id: org.id,
      });
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
          return {
            ok: false,
            error: humanAuthError(error?.message, "Не удалось зарегистрироваться"),
          };
        }

        // При включённом подтверждении email signUp не даёт сессию, а без неё
        // любые вставки летят анонимно и режутся RLS. Пробуем войти сразу;
        // если и это не дало сессию — визард покажет экран подтверждения
        // почты и достроит компанию после первого входа.
        if (!data.session) {
          const { data: signIn } = await sb.auth.signInWithPassword({ email, password });
          if (!signIn.session) {
            return { ok: false, error: "CONFIRM_EMAIL" };
          }
        }

        // Организация + профиль + членство создаются атомарно на сервере:
        // по частям это невозможно (RLS и защита профиля мешают друг другу).
        const { org, error: orgErr } = await callRegisterCompanyRpc(sb, input.company, email);
        if (orgErr || !org) {
          const message =
            orgErr === "platform_admin_cannot_own_company"
              ? "Этим аккаунтом нельзя завести компанию: он администратор платформы. Зарегистрируйте компанию на отдельную почту — иначе вы потеряете доступ к админке."
              : orgErr === "already_in_organization"
                ? "У этого аккаунта уже есть компания"
                : humanAuthError(orgErr, "Не удалось создать компанию. Попробуйте ещё раз.");
          return { ok: false, error: message };
        }
        setState((s) => ({
          ...s,
          organizations: [...s.organizations, orgRowToLocal(org)],
        }));
        upsertLocalUser({
          id: data.user.id,
          email,
          name: input.name.trim() || input.company.contactPerson || "Поставщик",
          city: input.company.city || "Алматы",
          role: "OPERATOR_ADMIN",
          organization_id: org.id,
        });
        toast.success("Компания создана. Кабинет открыт — можно публиковать услуги.");
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

    // Сначала активация на сервере: локальный Premium без серверной записи
    // рассинхронизирует профиль и даёт подписку «бесплатно» при сбое.
    if (sb) {
      try {
        const { activatePremiumSubscription } = await import("@/lib/premium.functions");
        await activatePremiumSubscription();
      } catch (err) {
        console.warn("[premium] server activation failed", err);
        return { ok: false, error: "Не удалось активировать Premium" };
      }
    }

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
      loginWithApple,
      logout,
      deleteAccount,
      registerTourist,
      registerOperator,
      registerCompanyForCurrentUser,
      purchasePremium,
      hasRole: (...roles) => (user ? roles.includes(user.role) : false),
      hasPermission: (permission) => {
        if (!user) return false;
        const perms = rolePermissions[user.role] ?? [];
        return perms.includes("admin:all") || perms.includes(permission);
      },
    }),
    [
      user,
      organization,
      login,
      loginWithApple,
      logout,
      deleteAccount,
      registerTourist,
      registerOperator,
      registerCompanyForCurrentUser,
      purchasePremium,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      {splashVisible ? <AppSplash fading={splashFading} /> : null}
    </AuthContext.Provider>
  );
}

export function useOptionalAuth() {
  return useContext(AuthContext);
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
  if (user && user.status === "suspended") {
    queueMicrotask(() => navigate({ to: "/login" }));
    return { allowed: false, user: null };
  }
  if (!isAuthenticated || !user) {
    // После входа возвращаем туда, куда человек шёл (избранное, профиль...).
    const next = `${window.location.pathname}${window.location.search}`;
    queueMicrotask(() => navigate({ to: "/login", search: { next } as never }));
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
