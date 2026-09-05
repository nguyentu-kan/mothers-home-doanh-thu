"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { isAppAdmin } from "@/lib/permissions";

export type MenuItemFormState = { error: string } | undefined;

async function requireManager() {
  const session = await requireSession();
  if (!isAppAdmin(session)) throw new Error("FORBIDDEN");
}

export async function createMenuItemAction(
  _prevState: MenuItemFormState,
  formData: FormData
): Promise<MenuItemFormState> {
  await requireManager();

  const category = String(formData.get("category") || "");
  const name = String(formData.get("name") || "").trim();
  const price = parseInt(String(formData.get("price") || "0"), 10);

  if (category !== "CA_PHE" && category !== "SPA") {
    return { error: "Vui lòng chọn loại." };
  }
  if (!name) {
    return { error: "Vui lòng nhập tên món." };
  }
  if (!Number.isFinite(price) || price < 0) {
    return { error: "Giá không hợp lệ." };
  }

  await prisma.menuItem.create({ data: { category, name, price } });
  revalidatePath("/quan-tri/mon-dich-vu");
  return undefined;
}

export async function updateMenuItemAction(formData: FormData) {
  await requireManager();

  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const price = parseInt(String(formData.get("price") || "0"), 10);
  const active = formData.get("active") === "on";

  if (!id || !name || !Number.isFinite(price)) return;

  await prisma.menuItem.update({ where: { id }, data: { name, price, active } });
  revalidatePath("/quan-tri/mon-dich-vu");
}
