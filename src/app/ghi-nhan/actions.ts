"use server";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { checkCashAndMaybeAlert } from "@/lib/cash";
import { revalidatePath } from "next/cache";

export type ServiceFormState =
  | { ok: true; message: string }
  | { ok: false; error: string }
  | undefined;

export async function createServiceRecordAction(
  _prevState: ServiceFormState,
  formData: FormData
): Promise<ServiceFormState> {
  const session = await requireSession();

  const category = String(formData.get("category") || "");
  const roomOrGuest = String(formData.get("roomOrGuest") || "").trim();
  const content = String(formData.get("content") || "").trim();
  const quantity = parseInt(String(formData.get("quantity") || "1"), 10);
  const unitPrice = parseInt(String(formData.get("unitPrice") || "0"), 10);
  const amount = parseInt(String(formData.get("amount") || "0"), 10);
  const paymentMethod = String(formData.get("paymentMethod") || "");
  const menuItemId = String(formData.get("menuItemId") || "") || null;

  if (category !== "CA_PHE" && category !== "SPA") {
    return { ok: false, error: "Vui lòng chọn loại dịch vụ." };
  }
  if (!content) {
    return { ok: false, error: "Vui lòng chọn hoặc nhập nội dung." };
  }
  if (!roomOrGuest) {
    return { ok: false, error: "Vui lòng nhập số phòng hoặc chọn Khách ngoài." };
  }
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { ok: false, error: "Số lượng không hợp lệ." };
  }
  if (!Number.isFinite(amount) || amount < 0) {
    return { ok: false, error: "Thành tiền không hợp lệ." };
  }
  if (!["GHI_PHONG", "TIEN_MAT", "CHUYEN_KHOAN"].includes(paymentMethod)) {
    return { ok: false, error: "Vui lòng chọn hình thức thanh toán." };
  }

  await prisma.serviceRecord.create({
    data: {
      category,
      roomOrGuest,
      content,
      quantity,
      unitPrice,
      amount,
      paymentMethod: paymentMethod as "GHI_PHONG" | "TIEN_MAT" | "CHUYEN_KHOAN",
      menuItemId,
      recordedByUserId: session.userId,
    },
  });

  await checkCashAndMaybeAlert();
  revalidatePath("/ghi-nhan");
  revalidatePath("/");
  revalidatePath("/so-thu-chi");

  return { ok: true, message: "Đã lưu!" };
}
