"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { canManageCashbook } from "@/lib/permissions";
import { uploadAttachment } from "@/lib/supabase";
import { checkCashAndMaybeAlert } from "@/lib/cash";

export type CashbookFormState = { error: string } | undefined;

async function requireCashbookAccess() {
  const session = await requireSession();
  if (!canManageCashbook(session)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}

export async function addRoomRevenueAction(
  _prevState: CashbookFormState,
  formData: FormData
): Promise<CashbookFormState> {
  const session = await requireCashbookAccess();

  const amount = parseInt(String(formData.get("amount") || "0"), 10);
  const method = String(formData.get("method") || "");
  const note = String(formData.get("note") || "").trim() || null;
  const attachment = formData.get("attachment") as File | null;

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Vui lòng nhập số tiền hợp lệ." };
  }
  if (method !== "TIEN_MAT" && method !== "CHUYEN_KHOAN") {
    return { error: "Vui lòng chọn hình thức." };
  }

  const attachmentUrl = await uploadAttachment(attachment);

  await prisma.roomRevenueEntry.create({
    data: { amount, method, note, attachmentUrl, recordedByUserId: session.userId },
  });

  await checkCashAndMaybeAlert();
  revalidatePath("/so-thu-chi");
  redirect("/so-thu-chi?saved=phong");
}

export async function addOtaReceivableAction(
  _prevState: CashbookFormState,
  formData: FormData
): Promise<CashbookFormState> {
  const session = await requireCashbookAccess();

  const amount = parseInt(String(formData.get("amount") || "0"), 10);
  const platform = String(formData.get("platform") || "");
  const note = String(formData.get("note") || "").trim() || null;
  const attachment = formData.get("attachment") as File | null;

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Vui lòng nhập số tiền hợp lệ." };
  }
  if (!["AGODA", "CTRIP", "BOOKING", "KHAC"].includes(platform)) {
    return { error: "Vui lòng chọn sàn OTA." };
  }

  const attachmentUrl = await uploadAttachment(attachment);

  await prisma.otaReceivable.create({
    data: {
      amount,
      platform: platform as "AGODA" | "CTRIP" | "BOOKING" | "KHAC",
      note,
      attachmentUrl,
      recordedByUserId: session.userId,
    },
  });

  revalidatePath("/so-thu-chi");
  redirect("/so-thu-chi?saved=ota");
}

export async function addExpenseAction(
  _prevState: CashbookFormState,
  formData: FormData
): Promise<CashbookFormState> {
  const session = await requireCashbookAccess();

  const amount = parseInt(String(formData.get("amount") || "0"), 10);
  const category = String(formData.get("category") || "");
  const method = String(formData.get("method") || "");
  const note = String(formData.get("note") || "").trim();
  const attachment = formData.get("attachment") as File | null;

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Vui lòng nhập số tiền hợp lệ." };
  }
  if (!["MAT_BANG", "LUONG", "MUA_HANG", "KHAC"].includes(category)) {
    return { error: "Vui lòng chọn hạng mục." };
  }
  if (method !== "TIEN_MAT" && method !== "CHUYEN_KHOAN") {
    return { error: "Vui lòng chọn hình thức." };
  }
  if (!note) {
    return { error: "Vui lòng ghi lý do chi." };
  }

  const attachmentUrl = await uploadAttachment(attachment);

  await prisma.expense.create({
    data: {
      amount,
      category: category as "MAT_BANG" | "LUONG" | "MUA_HANG" | "KHAC",
      method,
      note,
      attachmentUrl,
      recordedByUserId: session.userId,
    },
  });

  await checkCashAndMaybeAlert();
  revalidatePath("/so-thu-chi");
  redirect("/so-thu-chi?saved=chi");
}
