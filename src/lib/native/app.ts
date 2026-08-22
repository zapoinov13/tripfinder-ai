/** Detect Capacitor native shell (iOS / Android). Safe on server and in browser. */
export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return cap?.isNativePlatform?.() ?? false;
}

/** Query flag for app-store builds that should hide marketing chrome. */
export function isCompactAppUi(): boolean {
  if (typeof window === "undefined") return false;
  if (isNativeApp()) return true;
  return new URLSearchParams(window.location.search).get("app") === "1";
}
