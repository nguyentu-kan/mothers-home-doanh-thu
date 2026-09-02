"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { isManager } from "@/lib/permissions";
import { hashPassword } from "@/lib/auth";

export type UserFormState = { error: string } | undefined;

async function requireManager() {
  const session = await requireSession();
  if (!isManager(session.role)) throw new Error("FORBIDDEN");
  return session;
}

export async function createUserAction(_prevState: UserFormState, formData: FormData): Promise<UserFormState> {
  await requireManager();

  const name = String(formData.get("name") || "").trim();
  const username = String(formData.get("username") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const role = String(formData.get("role") || "NHAN_VIEN");
  const canManageCashbook = formData.get("canManageCashbook") === "on";

  if (!name || !username || !password) {
    return { error: "Vui lòng nhập đủ tên, tên đăng nhập và mật khẩu." };
  }
  if (password.length < 4) {
    return { error: "Mật khẩu tối thiểu 4 ký tự." };
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return { error: "Tên đăng nhập đã tồn tại, vui lòng chọn tên khác." };
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.create({
    data: {
      name,
      username,
      passwordHash,
      role: role as "NHAN_VIEN" | "QUAN_LY" | "CHU_SO_HUU",
      canManageCashbook,
    },
  });

  revalidatePath("/quan-tri/nhan-vien");
  return undefined;
}

export async function updateUserAction(formData: FormData) {
  await requireManager();

  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const role = String(formData.get("role") || "NHAN_VIEN");
  const canManageCashbook = formData.get("canManageCashbook") === "on";
  const active = formData.get("active") === "on";

  if (!id || !name) return;

  await prisma.user.update({
    where: { id },
    data: { name, role: role as "NHAN_VIEN" | "QUAN_LY" | "CHU_SO_HUU", canManageCashbook, active },
  });

  revalidatePath("/quan-tri/nhan-vien");
}

export async function resetPasswordAction(formData: FormData) {
  await requireManager();

  const id = String(formData.get("id") || "");
  const password = String(formData.get("newPassword") || "");
  if (!id || password.length < 4) return;

  const passwordHash = await hashPassword(password);
  await prisma.user.update({ where: { id }, data: { passwordHash } });

  revalidatePath("/quan-tri/nhan-vien");
}
