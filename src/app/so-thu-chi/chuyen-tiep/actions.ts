"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { canManageCashbook, isManager } from "@/lib/permissions";
import { uploadAttachments } from "@/lib/supabase";
import { checkCashAndMaybeAlert } from "@/lib/cash";
import { startOfDay } from "date-fns";

async function requireCashbookAccess() {
  const session = await requireSession();
  if (!canManageCashbook(session)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}

export type OwnerTransferFormState = { error: string } | undefined;

// Ghi 1 lần Ngọc Tiên đưa/chuyển tiền cho Cô Vân — CHUYEN_KHOAN (tiền khách đã chuyển khoản vào
// TK cá nhân Tiên, nay chuyển trả lại Cô Vân qua ngân hàng, kèm ảnh làm bằng chứng) hoặc TIEN_MAT
// (đưa trực tiếp tiền mặt tại quầy). Không tính là khoản Thu/Chi thật — CHUYEN_KHOAN chỉ trừ vào
// số dư "còn cần chuyển", TIEN_MAT chỉ trừ vào "Tiền mặt tại quầy" (xem lib/cash.ts).
export async function addOwnerTransferAction(
  _prevState: OwnerTransferFormState,
  formData: FormData
): Promise<OwnerTransferFormState> {
  const session = await requireCashbookAccess();

  const amount = parseInt(String(formData.get("amount") || "0"), 10);
  const method = String(formData.get("method") || "CHUYEN_KHOAN");
  const note = String(formData.get("note") || "").trim() || null;
  const attachments = formData.getAll("attachments").filter((f): f is File => f instanceof File && f.size > 0);

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Vui lòng nhập số tiền hợp lệ." };
  }
  if (method !== "TIEN_MAT" && method !== "CHUYEN_KHOAN") {
    return { error: "Hình thức không hợp lệ." };
  }

  const attachmentUrls = await uploadAttachments(attachments);

  await prisma.ownerTransfer.create({
    data: { amount, method, note, attachmentUrls, recordedByUserId: session.userId },
  });

  if (method === "TIEN_MAT") {
    await checkCashAndMaybeAlert();
  }
  revalidatePath("/so-thu-chi");
  revalidatePath("/bao-cao");
  revalidatePath("/ban-giao-ca");
  return undefined;
}

// Xoá 1 lần chuyển tiếp bị ghi sai — chỉ trong hôm nay, tự sửa bằng cách xoá rồi ghi lại.
export async function deleteOwnerTransferAction(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireCashbookAccess();

  const record = await prisma.ownerTransfer.findUnique({ where: { id } });
  if (!record) return { ok: false, error: "Không tìm thấy khoản này." };
  if (record.recordedByUserId !== session.userId && !isManager(session.role)) {
    return { ok: false, error: "Bạn không có quyền xoá khoản này." };
  }
  if (record.time < startOfDay(new Date())) {
    return { ok: false, error: "Chỉ xoá được khoản ghi trong hôm nay." };
  }

  await prisma.ownerTransfer.delete({ where: { id } });
  revalidatePath("/so-thu-chi");
  revalidatePath("/bao-cao");
  revalidatePath("/ban-giao-ca");
  return { ok: true };
}
