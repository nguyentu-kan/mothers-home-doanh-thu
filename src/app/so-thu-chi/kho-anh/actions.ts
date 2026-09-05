"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { canManageCashbook, isAppAdmin } from "@/lib/permissions";
import { uploadAttachments } from "@/lib/supabase";

async function requireCashbookAccess() {
  const session = await requireSession();
  if (!canManageCashbook(session)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}

export type UploadState = { error: string } | { ok: true } | undefined;

// Up ảnh nhanh vào kho, KHÔNG cần điền số liệu kế toán — mỗi file up thành 1 ảnh riêng trong kho,
// cùng chung ngày/ghi chú nếu up nhiều file 1 lần. Xử lý (gắn vào khoản/tạo khoản) làm sau, lúc nào tiện.
export async function uploadUnassignedAttachmentsAction(
  _prevState: UploadState,
  formData: FormData
): Promise<UploadState> {
  const session = await requireCashbookAccess();

  const dateStr = String(formData.get("date") || "");
  const note = String(formData.get("note") || "").trim() || null;
  const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);

  if (files.length === 0) {
    return { error: "Vui lòng chọn ít nhất 1 ảnh." };
  }

  const urls = await uploadAttachments(files);
  if (urls.length === 0) {
    return { error: "Tải ảnh lên thất bại, vui lòng thử lại." };
  }

  const time = dateStr ? new Date(dateStr) : new Date();
  await prisma.unassignedAttachment.createMany({
    data: urls.map((url) => ({ url, note, time, recordedByUserId: session.userId })),
  });

  revalidatePath("/so-thu-chi/kho-anh");
  return { ok: true };
}

// Xoá 1 ảnh trong kho (up nhầm/trùng/không cần nữa) — chủ app xoá được của bất kỳ ai, người khác
// chỉ xoá được ảnh của chính mình (giống mọi chỗ khác trong app).
export async function deleteUnassignedAttachmentAction(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireCashbookAccess();

  const record = await prisma.unassignedAttachment.findUnique({ where: { id } });
  if (!record) return { ok: false, error: "Không tìm thấy ảnh này." };
  if (record.recordedByUserId !== session.userId && !isAppAdmin(session)) {
    return { ok: false, error: "Bạn không có quyền xoá ảnh này." };
  }

  await prisma.unassignedAttachment.delete({ where: { id } });
  revalidatePath("/so-thu-chi/kho-anh");
  return { ok: true };
}

// Gắn 1 ảnh trong kho vào khoản "Chuyển tiếp cho Cô Vân" đã ghi sẵn — ảnh rời khỏi kho, chuyển
// hẳn sang thành ảnh đính kèm của khoản đó (cộng thêm, không thay ảnh cũ nếu khoản đã có ảnh khác).
export async function linkAttachmentToTransferAction(
  attachmentId: string,
  ownerTransferId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireCashbookAccess();

  const attachment = await prisma.unassignedAttachment.findUnique({ where: { id: attachmentId } });
  if (!attachment) return { ok: false, error: "Không tìm thấy ảnh này." };

  const transfer = await prisma.ownerTransfer.findUnique({ where: { id: ownerTransferId } });
  if (!transfer) return { ok: false, error: "Không tìm thấy khoản chuyển tiếp này." };

  await prisma.$transaction([
    prisma.ownerTransfer.update({
      where: { id: ownerTransferId },
      data: { attachmentUrls: { push: attachment.url } },
    }),
    prisma.unassignedAttachment.delete({ where: { id: attachmentId } }),
  ]);

  revalidatePath("/so-thu-chi/kho-anh");
  revalidatePath("/so-thu-chi");
  revalidatePath("/bao-cao");
  revalidatePath("/bao-cao/chi-tiet");
  return { ok: true };
}

export type CreateFromAttachmentState = { error: string } | { ok: true } | undefined;

// Tạo hẳn 1 khoản "Chuyển tiếp cho Cô Vân" mới từ 1 ảnh trong kho (khoản đó chưa từng được ghi tay
// trước đó) — ảnh rời khỏi kho, thành ảnh đính kèm duy nhất của khoản mới này.
export async function createTransferFromAttachmentAction(
  attachmentId: string,
  _prevState: CreateFromAttachmentState,
  formData: FormData
): Promise<CreateFromAttachmentState> {
  const session = await requireCashbookAccess();

  const attachment = await prisma.unassignedAttachment.findUnique({ where: { id: attachmentId } });
  if (!attachment) return { error: "Không tìm thấy ảnh này." };

  const amount = parseInt(String(formData.get("amount") || "0"), 10);
  const method = String(formData.get("method") || "CHUYEN_KHOAN");
  const note = String(formData.get("note") || "").trim() || null;
  const dateStr = String(formData.get("date") || "");
  const time = dateStr ? new Date(dateStr) : attachment.time;

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Số tiền không hợp lệ." };
  }
  if (method !== "TIEN_MAT" && method !== "CHUYEN_KHOAN") {
    return { error: "Hình thức không hợp lệ." };
  }

  await prisma.$transaction([
    prisma.ownerTransfer.create({
      data: {
        amount,
        method,
        note,
        time,
        attachmentUrls: [attachment.url],
        recordedByUserId: session.userId,
      },
    }),
    prisma.unassignedAttachment.delete({ where: { id: attachmentId } }),
  ]);

  revalidatePath("/so-thu-chi/kho-anh");
  revalidatePath("/so-thu-chi");
  revalidatePath("/bao-cao");
  revalidatePath("/bao-cao/chi-tiet");
  return { ok: true };
}
