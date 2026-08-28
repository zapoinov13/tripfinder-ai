/** Разделы с собственной навигацией: у них своя оболочка. */
const DASHBOARD_PREFIXES = ["/admin", "/operator"] as const;

export function isDashboardPath(pathname: string): boolean {
  return DASHBOARD_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
