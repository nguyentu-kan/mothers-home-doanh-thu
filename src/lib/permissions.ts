import type { Role } from "@prisma/client";
import type { SessionData } from "@/lib/session";

export function isManager(role?: Role) {
  return role === "QUAN_LY" || role === "CHU_SO_HUU";
}

// Chủ app thật sự (Ngọc Tiên) — người duy nhất có toàn quyền chỉnh sửa/quản trị. Quản lý/Chủ sở
// hữu khác (Cô Vân, Thầy Thành) vẫn xem được Báo cáo (canViewReports) nhưng không được sửa gì.
export function isAppAdmin(session: SessionData) {
  return Boolean(session.isAppAdmin);
}

export function canViewReports(session: SessionData) {
  return isManager(session.role);
}

export function canManageAdmin(session: SessionData) {
  return isAppAdmin(session);
}

export function canManageCashbook(session: SessionData) {
  return isAppAdmin(session) || Boolean(session.canManageCashbook);
}
