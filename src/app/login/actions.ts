"use server";

import { redirect } from "next/navigation";
import { findActiveUserByUsername, verifyPassword } from "@/lib/auth";
import { getSession } from "@/lib/session";

export type LoginState = { error?: string } | undefined;

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") || "");
  const password = String(formData.get("password") || "");

  if (!username || !password) {
    return { error: "Vui lòng chọn tên và nhập mật khẩu." };
  }

  const user = await findActiveUserByUsername(username);
  if (!user) {
    return { error: "Tài khoản không tồn tại hoặc đã bị khoá." };
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return { error: "Mật khẩu không đúng." };
  }

  const session = await getSession();
  session.userId = user.id;
  session.name = user.name;
  session.username = user.username;
  session.role = user.role;
  session.canManageCashbook = user.canManageCashbook;
  session.isAppAdmin = user.isAppAdmin;
  await session.save();

  redirect("/");
}
