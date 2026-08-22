/** Routes where the bottom tab bar should not appear. */
const TAB_BAR_HIDDEN_PREFIXES = [
  "/login",
  "/registration",
  "/admin",
  "/operator",
  "/company-signup",
] as const;

/** Dashboard areas use their own navigation chrome. */
const DASHBOARD_PREFIXES = ["/admin", "/operator"] as const;

export function shouldShowAppTabBar(pathname: string): boolean {
  if (TAB_BAR_HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return false;
  }
  return true;
}

export function isDashboardPath(pathname: string): boolean {
  return DASHBOARD_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function appTabBarPaddingClass(show: boolean): string {
  return show ? "pb-[calc(5.25rem+env(safe-area-inset-bottom))] md:pb-0" : "";
}
