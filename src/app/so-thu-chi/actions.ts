"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { canManageCashbook, isAppAdmin } from "@/lib/permissions";
import { uploadAttachments } from "@/lib/supabase";
import { checkCashAndMaybeAlert } from "@/lib/cash";
import { startOfDay } from "date-fns";

export type CashbookFormState = { error: string } | undefined;

async function requireCashbookAccess() {
  const session = await requireSession();
  if (!canManageCashbook(session)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}

function getAttachmentFiles(formData: FormData): File[] {
  return formData.getAll("attachments").filter((f): f is File => f instanceof File && f.size > 0);
}

export async function addRoomRevenueAction(
  _prevState: CashbookFormState,
  formData: FormData
): Promise<CashbookFormState> {
  const session = await requireCashbookAccess();

  const amount = parseInt(String(formData.get("amount") || "0"), 10);
  const method = String(formData.get("method") || "");
  const transferAccount = String(formData.get("transferAccount") || "");
  const note = String(formData.get("note") || "").trim() || null;
  const attachments = getAttachmentFiles(formData);

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Vui lòng nhập số tiền hợp lệ." };
  }
  if (method !== "TIEN_MAT" && method !== "CHUYEN_KHOAN") {
    return { error: "Vui lòng chọn hình thức." };
  }
  if (method === "CHUYEN_KHOAN" && transferAccount !== "TIEN" && transferAccount !== "VAN") {
    return { error: "Vui lòng chọn chuyển khoản vào tài khoản của ai." };
  }

  const attachmentUrls = await uploadAttachments(attachments);

  await prisma.roomRevenueEntry.create({
    data: {
      amount,
      method,
      transferAccount: method === "CHUYEN_KHOAN" ? (transferAccount as "TIEN" | "VAN") : null,
      note,
      attachmentUrls,
      recordedByUserId: session.userId,
    },
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
  const attachments = getAttachmentFiles(formData);

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Vui lòng nhập số tiền hợp lệ." };
  }
  if (!["AGODA", "CTRIP", "BOOKING", "KHAC"].includes(platform)) {
    return { error: "Vui lòng chọn sàn OTA." };
  }

  const attachmentUrls = await uploadAttachments(attachments);

  await prisma.otaReceivable.create({
    data: {
      amount,
      platform: platform as "AGODA" | "CTRIP" | "BOOKING" | "KHAC",
      note,
      attachmentUrls,
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
  const attachments = getAttachmentFiles(formData);

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

  const attachmentUrls = await uploadAttachments(attachments);

  await prisma.expense.create({
    data: {
      amount,
      category: category as "MAT_BANG" | "LUONG" | "MUA_HANG" | "KHAC",
      method,
      note,
      attachmentUrls,
      recordedByUserId: session.userId,
    },
  });

  await checkCashAndMaybeAlert();
  revalidatePath("/so-thu-chi");
  redirect("/so-thu-chi?saved=chi");
}

type DeleteResult = { ok: true } | { ok: false; error: string };

// Chỉ tự xoá được khoản của chính mình, trong hôm nay — sửa sai bằng cách xoá rồi ghi lại.
// Chủ app (Ngọc Tiên) xoá được khoản của bất kỳ ai trong ngày để hỗ trợ sửa lỗi.
async function checkDeletePermission(
  session: Awaited<ReturnType<typeof requireCashbookAccess>>,
  record: { recordedByUserId: string; time: Date }
): Promise<DeleteResult> {
  if (record.recordedByUserId !== session.userId && !isAppAdmin(session)) {
    return { ok: false, error: "Bạn không có quyền xoá khoản này." };
  }
  if (record.time < startOfDay(new Date())) {
    return { ok: false, error: "Chỉ xoá được khoản ghi trong hôm nay." };
  }
  return { ok: true };
}

export async function deleteRoomRevenueAction(id: string): Promise<DeleteResult> {
  const session = await requireCashbookAccess();

  const record = await prisma.roomRevenueEntry.findUnique({
    where: { id },
    include: { pendingReceivable: true },
  });
  if (!record) return { ok: false, error: "Không tìm thấy khoản này." };
  const permission = await checkDeletePermission(session, record);
  if (!permission.ok) return permission;

  // Nếu khoản này thật ra là tiền vừa thu từ 1 khoản "Còn phải thu" (khách nợ), xoá nhầm sẽ làm
  // mất luôn dấu vết khách còn nợ — trả khoản đó về trạng thái "chưa thu" thay vì mất hẳn.
  if (record.pendingReceivable) {
    await prisma.pendingReceivable.update({
      where: { id: record.pendingReceivable.id },
      data: {
        status: "PENDING",
        collectedMethod: null,
        collectedTransferAccount: null,
        collectedAt: null,
        collectedByUserId: null,
        roomRevenueEntryId: null,
      },
    });
  }

  await prisma.roomRevenueEntry.delete({ where: { id } });
  await checkCashAndMaybeAlert();
  revalidatePath("/so-thu-chi");
  return { ok: true };
}

export async function deleteOtaAction(id: string): Promise<DeleteResult> {
  const session = await requireCashbookAccess();

  const record = await prisma.otaReceivable.findUnique({ where: { id } });
  if (!record) return { ok: false, error: "Không tìm thấy khoản này." };
  const permission = await checkDeletePermission(session, { recordedByUserId: record.recordedByUserId, time: record.date });
  if (!permission.ok) return permission;

  await prisma.otaReceivable.delete({ where: { id } });
  revalidatePath("/so-thu-chi");
  return { ok: true };
}

export async function deleteExpenseAction(id: string): Promise<DeleteResult> {
  const session = await requireCashbookAccess();

  const record = await prisma.expense.findUnique({ where: { id } });
  if (!record) return { ok: false, error: "Không tìm thấy khoản này." };
  const permission = await checkDeletePermission(session, record);
  if (!permission.ok) return permission;

  await prisma.expense.delete({ where: { id } });
  await checkCashAndMaybeAlert();
  revalidatePath("/so-thu-chi");
  return { ok: true };
}
