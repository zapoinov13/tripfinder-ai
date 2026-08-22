import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { isNativeApp } from "@/lib/native/app";

const PUSH_PREF_KEY = "tourgo.push.enabled";

export function isPushEnabledLocally(): boolean {
  if (typeof window === "undefined") return true;
  const raw = localStorage.getItem(PUSH_PREF_KEY);
  return raw !== "0";
}

export function setPushEnabledLocally(enabled: boolean) {
  localStorage.setItem(PUSH_PREF_KEY, enabled ? "1" : "0");
}

async function saveDeviceToken(token: string, platform: "ios" | "android") {
  if (!isSupabaseConfigured) {
    localStorage.setItem("tourgo.push.token", token);
    return;
  }

  const sb = getSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();

  const row = {
    token,
    platform,
    user_id: user?.id ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await sb.from("device_tokens").upsert(row, { onConflict: "token" });
  if (error) {
    console.warn("[push] token save skipped", error.message);
    localStorage.setItem("tourgo.push.token", token);
  }
}

export async function linkPushTokenToCurrentUser() {
  if (!isNativeApp() || !isSupabaseConfigured) return;
  const stored = localStorage.getItem("tourgo.push.token");
  if (!stored) return;
  const { Capacitor } = await import("@capacitor/core");
  const platform = Capacitor.getPlatform() === "ios" ? "ios" : "android";
  await saveDeviceToken(stored, platform);
}

export async function registerNativePushNotifications() {
  if (!isNativeApp() || !isPushEnabledLocally()) return;

  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const { Capacitor } = await import("@capacitor/core");

    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === "prompt") {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== "granted") return;

    await PushNotifications.register();

    await PushNotifications.addListener("registration", (ev) => {
      const platform = Capacitor.getPlatform() === "ios" ? "ios" : "android";
      void saveDeviceToken(ev.value, platform);
    });

    await PushNotifications.addListener("registrationError", (err) => {
      console.warn("[push] registration error", err);
    });

    await PushNotifications.addListener("pushNotificationReceived", (notification) => {
      console.info("[push] received", notification.title);
    });
  } catch (err) {
    console.warn("[push] setup skipped", err);
  }
}

export async function unregisterNativePushNotifications() {
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    await PushNotifications.removeAllListeners();
  } catch {
    // ignore
  }
}
