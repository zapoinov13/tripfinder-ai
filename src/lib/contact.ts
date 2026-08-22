/** Public support contact — override via VITE_SUPPORT_EMAIL on Vercel. */
export const SUPPORT_EMAIL =
  (import.meta.env.VITE_SUPPORT_EMAIL as string | undefined)?.trim() || "support@tourgo.app";

export const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}`;
