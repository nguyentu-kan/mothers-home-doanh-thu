"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { isManager } from "@/lib/permissions";
import { checkCashAndMaybeAlert } from "@/lib/cash";
import type { ActivityRowKind } from "@/lib/activity";

export type UpdateActivityRowState = { error: string } | { ok: true } | undefined;

// Trang chi tiết chỉ Quản lý/Chủ sở hữu vào được (chặn ở proxy.ts), nên sửa ở đây không giới hạn
// "chỉ hôm nay" như tự xoá nhanh ở Sổ Thu Chi — Quản lý được sửa mọi khoản, mọi ngày.
async function requireManager() {
  const session = await requireSession();
  if (!isManager(session.role)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}

export async function updateActivityRowAction(
  kind: ActivityRowKind,
  id: string,
  _prevState: UpdateActivityRowState,
  formData: FormData
): Promise<UpdateActivityRowState> {
  await requireManager();

  const amount = parseInt(String(formData.get("amount") || "0"), 10);
  const note = String(formData.get("note") || "").trim();
  const dateStr = String(formData.get("date") || "");
  const time = dateStr ? new Date(dateStr) : undefined;

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Số tiền không hợp lệ." };
  }

  switch (kind) {
    case "SERVICE": {
      const roomOrGuest = String(formData.get("roomOrGuest") || "").trim();
      const content = String(formData.get("content") || "").trim();
      const method = String(formData.get("method") || "");
      if (!["GHI_PHONG", "TIEN_MAT", "CHUYEN_KHOAN"].includes(method)) {
        return { error: "Hình thức không hợp lệ." };
      }
      await prisma.serviceRecord.update({
        where: { id },
        data: {
          amount,
          roomOrGuest: roomOrGuest || undefined,
          content: content || undefined,
          paymentMethod: method as "GHI_PHONG" | "TIEN_MAT" | "CHUYEN_KHOAN",
          ...(time && { time }),
        },
      });
      break;
    }
    case "ROOM": {
      const method = String(formData.get("method") || "");
      if (!["TIEN_MAT", "CHUYEN_KHOAN"].includes(method)) {
        return { error: "Hình thức không hợp lệ." };
      }
      const transferAccountRaw = String(formData.get("transferAccount") || "");
      const transferAccount =
        method === "CHUYEN_KHOAN" && (transferAccountRaw === "TIEN" || transferAccountRaw === "VAN")
          ? transferAccountRaw
          : null;
      await prisma.roomRevenueEntry.update({
        where: { id },
        data: {
          amount,
          note: note || null,
          method: method as "TIEN_MAT" | "CHUYEN_KHOAN",
          transferAccount,
          ...(time && { time }),
        },
      });
      break;
    }
    case "OTA": {
      const platform = String(formData.get("platform") || "");
      if (!["AGODA", "CTRIP", "BOOKING", "KHAC"].includes(platform)) {
        return { error: "Sàn OTA không hợp lệ." };
      }
      await prisma.otaReceivable.update({
        where: { id },
        data: {
          amount,
          note: note || null,
          platform: platform as "AGODA" | "CTRIP" | "BOOKING" | "KHAC",
          ...(time && { date: time }),
        },
      });
      break;
    }
    case "EXPENSE": {
      const category = String(formData.get("category") || "");
      const method = String(formData.get("method") || "");
      if (!["MAT_BANG", "LUONG", "MUA_HANG", "KHAC"].includes(category)) {
        return { error: "Hạng mục không hợp lệ." };
      }
      if (!["TIEN_MAT", "CHUYEN_KHOAN"].includes(method)) {
        return { error: "Hình thức không hợp lệ." };
      }
      if (!note) {
        return { error: "Vui lòng nhập lý do chi." };
      }
      await prisma.expense.update({
        where: { id },
        data: {
          amount,
          note,
          category: category as "MAT_BANG" | "LUONG" | "MUA_HANG" | "KHAC",
          method: method as "TIEN_MAT" | "CHUYEN_KHOAN",
          ...(time && { time }),
        },
      });
      break;
    }
    case "PENDING": {
      await prisma.pendingReceivable.update({
        where: { id },
        data: { amount, note: note || null, ...(time && { time }) },
      });
      break;
    }
    case "OWNER_TRANSFER": {
      const method = String(formData.get("method") || "");
      if (!["TIEN_MAT", "CHUYEN_KHOAN"].includes(method)) {
        return { error: "Hình thức không hợp lệ." };
      }
      await prisma.ownerTransfer.update({
        where: { id },
        data: {
          amount,
          note: note || null,
          method: method as "TIEN_MAT" | "CHUYEN_KHOAN",
          ...(time && { time }),
        },
      });
      break;
    }
  }

  await checkCashAndMaybeAlert();
  revalidatePath("/bao-cao/chi-tiet");
  revalidatePath("/bao-cao");
  revalidatePath("/so-thu-chi");
  revalidatePath("/ghi-nhan");
  revalidatePath("/ban-giao-ca");
  return { ok: true };
}
