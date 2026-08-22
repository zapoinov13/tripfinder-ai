import type { Role } from "@/lib/platform-contracts";

export function getPostLoginPath(role?: Role): string {
  if (!role) return "/profile";
  if (role === "PLATFORM_ADMIN" || role === "PLATFORM_MANAGER") return "/admin";
  if (role.startsWith("OPERATOR")) return "/operator";
  return "/profile";
}
