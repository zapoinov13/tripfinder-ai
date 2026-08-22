import { isNativeApp } from "@/lib/native/app";

export type AppleAuthResult =
  | { mode: "idToken"; idToken: string; email?: string | null; givenName?: string | null }
  | { mode: "oauth" };

/** Native Sign in with Apple on iOS; on web returns oauth mode for Supabase redirect. */
export async function authorizeAppleSignIn(): Promise<AppleAuthResult> {
  if (typeof window === "undefined") return { mode: "oauth" };

  if (isNativeApp()) {
    try {
      const { Capacitor } = await import("@capacitor/core");
      if (Capacitor.getPlatform() === "ios") {
        const { SignInWithApple } = await import("@capacitor-community/apple-sign-in");
        const result = await SignInWithApple.authorize({
          clientId: "com.tourgo.app",
          redirectURI: "https://tripfinder-ai.vercel.app/login",
          scopes: "email name",
        });
        const idToken = result.response.identityToken;
        if (!idToken) throw new Error("Apple не вернул identity token");
        return {
          mode: "idToken",
          idToken,
          email: result.response.email,
          givenName: result.response.givenName,
        };
      }
    } catch (err) {
      console.warn("[apple-auth] native flow failed, falling back to OAuth", err);
    }
  }

  return { mode: "oauth" };
}

export function shouldShowAppleSignIn(): boolean {
  if (typeof window === "undefined") return false;
  if (isNativeApp()) return true;
  // Safari / iOS browser
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}
