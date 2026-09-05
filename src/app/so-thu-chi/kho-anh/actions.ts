"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { canManageCashbook, isAppAdmin } from "@/lib/permissions";
import { uploadAttachments } from "@/lib/supabase";
import { extractTransferInfo } from "@/lib/gemini";
import { formatDateVn, formatVnd } from "@/lib/format";

async function requireCashbookAccess() {
  const session = await requireSession();
  if (!canManageCashbook(session)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}

export type UploadState = { error: string } | { ok: true } | undefined;

// Up ảnh nhanh vào kho, KHÔNG cần điền số liệu kế toán — mỗi file up thành 1 ảnh riêng trong kho,
// cùng chung ngày/ghi chú nếu up nhiều file 1 lần (trừ khi AI đọc được đúng ngày trên ảnh, dùng
// ngày đó thay vì ngày chọn tay). Xử lý (gắn vào khoản/tạo khoản) làm sau, lúc nào tiện.
//
// Lưu ý về duplicateWarning: KHÔNG chặn việc lưu ảnh khi phát hiện trùng mã giao dịch (form action
// của React tự reset toàn bộ field — kể cả file đã chọn — ngay khi action chạy xong, nên không thể
// giữ file lại chờ xác nhận rồi nộp lại lần 2 được). Thay vào đó: vẫn lưu ảnh ngay, nhưng gắn cờ
// cảnh báo hiển thị ngay trên ảnh đó cho đến khi người dùng tự bấm "đã kiểm tra" — vẫn đúng tinh
// thần "cảnh báo + yêu cầu xác nhận", chỉ khác là xác nhận SAU khi lưu thay vì chặn TRƯỚC khi lưu.
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

  // Mỗi ảnh: upload lên Supabase + nhờ AI đọc thử ngày/số tiền/mã giao dịch — 2 việc độc lập trên
  // cùng 1 file nên chạy song song; lỗi đọc AI không chặn việc lưu ảnh vào kho.
  const results = await Promise.all(
    files.map(async (file) => {
      const [urls, buffer] = await Promise.all([uploadAttachments([file]), file.arrayBuffer()]);
      const url = urls[0];
      if (!url) return null;
      const info = await extractTransferInfo({
        data: Buffer.from(buffer).toString("base64"),
        mimeType: file.type || "image/jpeg",
      });
      return { url, info };
    })
  );

  const uploaded = results.filter(
    (r): r is { url: string; info: { amount: number | null; date: string | null; transactionCode: string | null } } => r !== null
  );
  if (uploaded.length === 0) {
    return { error: "Tải ảnh lên thất bại, vui lòng thử lại." };
  }

  // Kiểm tra trùng mã giao dịch với ảnh/khoản đã có sẵn trong DB (chưa tính các ảnh khác trong CÙNG
  // lượt up này, xử lý riêng bên dưới).
  const codes = [...new Set(uploaded.map((u) => u.info.transactionCode).filter((c): c is string => !!c))];
  const [dupAttachments, dupTransfers] = codes.length
    ? await Promise.all([
        prisma.unassignedAttachment.findMany({ where: { transactionCode: { in: codes } } }),
        prisma.ownerTransfer.findMany({ where: { transactionCode: { in: codes } } }),
      ])
    : [[], []];

  function duplicateLabelFor(transactionCode: string | null, seenSoFar: Set<string>): string | null {
    if (!transactionCode) return null;
    const matchAttachment = dupAttachments.find((d) => d.transactionCode === transactionCode);
    const matchTransfer = dupTransfers.find((d) => d.transactionCode === transactionCode);
    if (matchAttachment) return `Mã GD trùng với 1 ảnh khác đã có trong kho (${formatDateVn(matchAttachment.time)})`;
    if (matchTransfer)
      return `Mã GD trùng với khoản Chuyển tiếp cho Cô Vân đã ghi (${formatDateVn(matchTransfer.time)} — ${formatVnd(matchTransfer.amount)})`;
    // Trùng với 1 ảnh khác trong CÙNG lượt up này (vd lỡ chọn nhầm cùng 1 ảnh 2 lần).
    if (seenSoFar.has(transactionCode)) return "Mã GD trùng với 1 ảnh khác trong lượt up này";
    return null;
  }

  const seen = new Set<string>();
  const rows = uploaded.map(({ url, info }) => {
    const duplicateWarning = duplicateLabelFor(info.transactionCode, seen);
    if (info.transactionCode) seen.add(info.transactionCode);
    return {
      url,
      note,
      // Ưu tiên ngày tự chọn tay (nếu có) — chỉ dùng ngày AI đọc được trên ảnh khi không tự chọn,
      // và dùng hôm nay nếu cả 2 đều không có.
      time: dateStr ? new Date(dateStr) : info.date ? new Date(info.date) : new Date(),
      suggestedAmount: info.amount,
      transactionCode: info.transactionCode,
      duplicateWarning,
      recordedByUserId: session.userId,
    };
  });

  await prisma.unassignedAttachment.createMany({ data: rows });

  revalidatePath("/so-thu-chi/kho-anh");
  return { ok: true };
}

// Xác nhận đã kiểm tra cảnh báo trùng mã giao dịch của 1 ảnh — chỉ xoá cờ cảnh báo, KHÔNG xoá ảnh.
export async function acknowledgeDuplicateWarningAction(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireCashbookAccess();

  const record = await prisma.unassignedAttachment.findUnique({ where: { id } });
  if (!record) return { ok: false, error: "Không tìm thấy ảnh này." };
  if (record.recordedByUserId !== session.userId && !isAppAdmin(session)) {
    return { ok: false, error: "Bạn không có quyền xác nhận ảnh này." };
  }

  await prisma.unassignedAttachment.update({ where: { id }, data: { duplicateWarning: null } });
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
      data: {
        attachmentUrls: { push: attachment.url },
        // Khoản đã ghi tay thường chưa có mã giao dịch — nếu ảnh gắn vào có, lưu lại luôn để lần
        // sau phát hiện trùng vẫn nhận ra khoản này (không chỉ nhận ra khi còn nằm trong kho ảnh).
        ...(transfer.transactionCode == null && attachment.transactionCode
          ? { transactionCode: attachment.transactionCode }
          : {}),
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
        transactionCode: attachment.transactionCode,
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
