import type { Role } from "@prisma/client";
import type { SessionData } from "@/lib/session";

export function isManager(role?: Role) {
  return role === "QUAN_LY" || role === "CHU_SO_HUU";
}

export function canViewReports(session: SessionData) {
  return isManager(session.role);
}

export function canManageAdmin(session: SessionData) {
  return isManager(session.role);
}

export function canManageCashbook(session: SessionData) {
  return isManager(session.role) || Boolean(session.canManageCashbook);
}
