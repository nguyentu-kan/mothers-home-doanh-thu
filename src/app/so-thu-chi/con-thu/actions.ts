"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { canManageCashbook } from "@/lib/permissions";
import { checkCashAndMaybeAlert } from "@/lib/cash";

async function requireCashbookAccess() {
  const session = await requireSession();
  if (!canManageCashbook(session)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}

export type PendingReceivableFormState = { error: string } | undefined;

// Ghi tay 1 khoản còn phải thu — dùng khi không qua AI đọc ảnh (vd nghe điện thoại, nhớ lại).
export async function addPendingReceivableAction(
  _prevState: PendingReceivableFormState,
  formData: FormData
): Promise<PendingReceivableFormState> {
  const session = await requireCashbookAccess();

  const amount = parseInt(String(formData.get("amount") || "0"), 10);
  const note = String(formData.get("note") || "").trim() || null;

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Vui lòng nhập số tiền hợp lệ." };
  }

  await prisma.pendingReceivable.create({
    data: { amount, note, recordedByUserId: session.userId },
  });

  revalidatePath("/so-thu-chi");
  return undefined;
}

// Đánh dấu đã thu được tiền — ai thu (ca nào, ngày nào) cũng bấm được, không nhất thiết phải là
// người ghi lúc đầu. Tạo luôn khoản Thu phòng thật tương ứng, không phải chỉnh sửa thủ công lại.
export async function collectPendingReceivableAction(
  id: string,
  method: "TIEN_MAT" | "CHUYEN_KHOAN",
  transferAccount: "TIEN" | "VAN" | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireCashbookAccess();

  const pending = await prisma.pendingReceivable.findUnique({ where: { id } });
  if (!pending) {
    return { ok: false, error: "Không tìm thấy khoản này." };
  }
  if (pending.status === "COLLECTED") {
    return { ok: false, error: "Khoản này đã được đánh dấu đã thu rồi." };
  }
  if (method === "CHUYEN_KHOAN" && transferAccount !== "TIEN" && transferAccount !== "VAN") {
    return { ok: false, error: "Vui lòng chọn chuyển khoản vào tài khoản của ai." };
  }

  const roomRevenueEntry = await prisma.roomRevenueEntry.create({
    data: {
      amount: pending.amount,
      method,
      transferAccount: method === "CHUYEN_KHOAN" ? transferAccount : null,
      note: pending.note ? `${pending.note} (đã thu khoản còn nợ)` : "Đã thu khoản còn nợ",
      recordedByUserId: session.userId,
    },
  });

  await prisma.pendingReceivable.update({
    where: { id },
    data: {
      status: "COLLECTED",
      collectedMethod: method,
      collectedTransferAccount: method === "CHUYEN_KHOAN" ? transferAccount : null,
      collectedAt: new Date(),
      collectedByUserId: session.userId,
      roomRevenueEntryId: roomRevenueEntry.id,
    },
  });

  await checkCashAndMaybeAlert();
  revalidatePath("/so-thu-chi");

  return { ok: true };
}
