"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { isAppAdmin } from "@/lib/permissions";

export async function updateSettingsAction(formData: FormData) {
  const session = await requireSession();
  if (!isAppAdmin(session)) return;

  const warning = String(formData.get("cash_warning_threshold") || "3000000");
  const danger = String(formData.get("cash_danger_threshold") || "5000000");
  const email = String(formData.get("manager_alert_email") || "").trim();
  const initialCash = String(formData.get("initial_cash") || "0");

  const entries: [string, string][] = [
    ["cash_warning_threshold", warning],
    ["cash_danger_threshold", danger],
    ["manager_alert_email", email],
    ["initial_cash", initialCash],
  ];

  await Promise.all(
    entries.map(([key, value]) =>
      prisma.appSetting.upsert({ where: { key }, update: { value }, create: { key, value } })
    )
  );

  // Chỉ set mốc khởi tạo 1 lần (nếu chưa có ca nào được xác nhận, đây là mốc bắt đầu tính tiền mặt)
  const genesis = await prisma.appSetting.findUnique({ where: { key: "genesis_date" } });
  if (!genesis) {
    await prisma.appSetting.create({ data: { key: "genesis_date", value: new Date().toISOString() } });
  }

  revalidatePath("/quan-tri/cai-dat");
}
