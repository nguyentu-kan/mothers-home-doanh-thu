"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { canManageCashbook, isManager } from "@/lib/permissions";
import { uploadAttachments } from "@/lib/supabase";
import { startOfDay } from "date-fns";

async function requireCashbookAccess() {
  const session = await requireSession();
  if (!canManageCashbook(session)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}

export type OwnerTransferFormState = { error: string } | undefined;

// Ghi 1 lần Ngọc Tiên chuyển tiền (đã nhận vào TK cá nhân) lại cho Cô Vân, kèm ảnh chuyển khoản
// làm bằng chứng — không tính là khoản Thu/Chi (tiền này đã tính vào Thu phòng lúc khách chuyển rồi),
// chỉ dùng để trừ vào số dư "còn cần chuyển".
export async function addOwnerTransferAction(
  _prevState: OwnerTransferFormState,
  formData: FormData
): Promise<OwnerTransferFormState> {
  const session = await requireCashbookAccess();

  const amount = parseInt(String(formData.get("amount") || "0"), 10);
  const note = String(formData.get("note") || "").trim() || null;
  const attachments = formData.getAll("attachments").filter((f): f is File => f instanceof File && f.size > 0);

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Vui lòng nhập số tiền hợp lệ." };
  }

  const attachmentUrls = await uploadAttachments(attachments);

  await prisma.ownerTransfer.create({
    data: { amount, note, attachmentUrls, recordedByUserId: session.userId },
  });

  revalidatePath("/so-thu-chi");
  revalidatePath("/bao-cao");
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
  return { ok: true };
}
