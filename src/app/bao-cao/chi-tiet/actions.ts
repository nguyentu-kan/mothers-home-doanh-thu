"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { isManager } from "@/lib/permissions";
import { checkCashAndMaybeAlert } from "@/lib/cash";
import type { ActivityRowKind } from "@/lib/activity";

export type UpdateActivityRowState = { error: string } | { ok: true } | undefined;

// "Loại khoản" chọn được trong form sửa — chi tiết hơn ActivityRowKind vì Dịch vụ tách thành
// 2 lựa chọn (Cà phê / Spa) để người dùng thấy đúng như trên các nút nhập tay ngoài trang chính.
export type TargetType = "ROOM" | "OTA" | "EXPENSE" | "SERVICE_CA_PHE" | "SERVICE_SPA" | "PENDING" | "OWNER_TRANSFER";

function targetTypeToKind(targetType: TargetType): ActivityRowKind {
  if (targetType === "SERVICE_CA_PHE" || targetType === "SERVICE_SPA") return "SERVICE";
  return targetType;
}

async function requireManager() {
  const session = await requireSession();
  if (!isManager(session.role)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}

type OriginalMeta = { recordedByUserId: string; attachmentUrls: string[] };

// Lấy trước tác giả gốc + ảnh đính kèm (nếu có) — cần giữ lại khi ghi nhầm loại khoản (vd Cà phê bị
// ghi thành Thu phòng) và phải xoá bản ghi cũ, tạo bản ghi mới ở bảng khác.
async function fetchOriginalMeta(kind: ActivityRowKind, id: string): Promise<OriginalMeta> {
  switch (kind) {
    case "SERVICE": {
      const r = await prisma.serviceRecord.findUniqueOrThrow({ where: { id } });
      return { recordedByUserId: r.recordedByUserId, attachmentUrls: [] };
    }
    case "ROOM": {
      const r = await prisma.roomRevenueEntry.findUniqueOrThrow({ where: { id } });
      return { recordedByUserId: r.recordedByUserId, attachmentUrls: r.attachmentUrls };
    }
    case "OTA": {
      const r = await prisma.otaReceivable.findUniqueOrThrow({ where: { id } });
      return { recordedByUserId: r.recordedByUserId, attachmentUrls: r.attachmentUrls };
    }
    case "EXPENSE": {
      const r = await prisma.expense.findUniqueOrThrow({ where: { id } });
      return { recordedByUserId: r.recordedByUserId, attachmentUrls: r.attachmentUrls };
    }
    case "PENDING": {
      const r = await prisma.pendingReceivable.findUniqueOrThrow({ where: { id } });
      return { recordedByUserId: r.recordedByUserId, attachmentUrls: [] };
    }
    case "OWNER_TRANSFER": {
      const r = await prisma.ownerTransfer.findUniqueOrThrow({ where: { id } });
      return { recordedByUserId: r.recordedByUserId, attachmentUrls: r.attachmentUrls };
    }
  }
}

async function deleteByKind(kind: ActivityRowKind, id: string) {
  switch (kind) {
    case "SERVICE":
      return prisma.serviceRecord.delete({ where: { id } });
    case "ROOM":
      return prisma.roomRevenueEntry.delete({ where: { id } });
    case "OTA":
      return prisma.otaReceivable.delete({ where: { id } });
    case "EXPENSE":
      return prisma.expense.delete({ where: { id } });
    case "PENDING":
      return prisma.pendingReceivable.delete({ where: { id } });
    case "OWNER_TRANSFER":
      return prisma.ownerTransfer.delete({ where: { id } });
  }
}

type NewRecordInput = {
  amount: number;
  note: string;
  time: Date;
  recordedByUserId: string;
  attachmentUrls: string[];
  method: string;
  platform: string;
  category: string;
  transferAccount: "TIEN" | "VAN" | null;
  roomOrGuest: string;
  content: string;
};

async function createForTargetType(targetType: TargetType, data: NewRecordInput) {
  switch (targetType) {
    case "ROOM":
      return prisma.roomRevenueEntry.create({
        data: {
          amount: data.amount,
          note: data.note || null,
          method: data.method as "TIEN_MAT" | "CHUYEN_KHOAN",
          transferAccount: data.transferAccount,
          time: data.time,
          recordedByUserId: data.recordedByUserId,
          attachmentUrls: data.attachmentUrls,
        },
      });
    case "OTA":
      return prisma.otaReceivable.create({
        data: {
          amount: data.amount,
          note: data.note || null,
          platform: data.platform as "AGODA" | "CTRIP" | "BOOKING" | "KHAC",
          date: data.time,
          recordedByUserId: data.recordedByUserId,
          attachmentUrls: data.attachmentUrls,
        },
      });
    case "EXPENSE":
      return prisma.expense.create({
        data: {
          amount: data.amount,
          note: data.note || "(chuyển loại khoản)",
          category: data.category as "MAT_BANG" | "LUONG" | "MUA_HANG" | "KHAC",
          method: data.method as "TIEN_MAT" | "CHUYEN_KHOAN",
          time: data.time,
          recordedByUserId: data.recordedByUserId,
          attachmentUrls: data.attachmentUrls,
        },
      });
    case "SERVICE_CA_PHE":
    case "SERVICE_SPA":
      return prisma.serviceRecord.create({
        data: {
          amount: data.amount,
          category: targetType === "SERVICE_CA_PHE" ? "CA_PHE" : "SPA",
          content: data.content || data.note || "-",
          roomOrGuest: data.roomOrGuest || "-",
          quantity: 1,
          unitPrice: data.amount,
          paymentMethod: data.method as "GHI_PHONG" | "TIEN_MAT" | "CHUYEN_KHOAN",
          time: data.time,
          recordedByUserId: data.recordedByUserId,
        },
      });
    case "PENDING":
      return prisma.pendingReceivable.create({
        data: {
          amount: data.amount,
          note: data.note || null,
          time: data.time,
          recordedByUserId: data.recordedByUserId,
        },
      });
    case "OWNER_TRANSFER":
      return prisma.ownerTransfer.create({
        data: {
          amount: data.amount,
          note: data.note || null,
          method: data.method as "TIEN_MAT" | "CHUYEN_KHOAN",
          time: data.time,
          recordedByUserId: data.recordedByUserId,
          attachmentUrls: data.attachmentUrls,
        },
      });
  }
}

// Trang chi tiết chỉ Quản lý/Chủ sở hữu vào được (chặn ở proxy.ts), nên sửa ở đây không giới hạn
// "chỉ hôm nay" như tự xoá nhanh ở Sổ Thu Chi — Quản lý được sửa mọi khoản, mọi ngày.
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
  const targetType = String(formData.get("targetType") || "") as TargetType;

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Số tiền không hợp lệ." };
  }

  const validTargetTypes: TargetType[] = [
    "ROOM",
    "OTA",
    "EXPENSE",
    "SERVICE_CA_PHE",
    "SERVICE_SPA",
    "PENDING",
    "OWNER_TRANSFER",
  ];
  if (!validTargetTypes.includes(targetType)) {
    return { error: "Loại khoản không hợp lệ." };
  }

  // Ghi nhầm loại khoản (vd Cà phê bị ghi thành Thu phòng) — xoá bản ghi cũ, tạo bản ghi mới đúng
  // loại, giữ nguyên người ghi gốc và ảnh đính kèm (nếu loại mới cũng hỗ trợ ảnh).
  if (targetTypeToKind(targetType) !== kind) {
    const original = await fetchOriginalMeta(kind, id);
    if (targetType === "EXPENSE" && !note) {
      return { error: "Vui lòng nhập lý do chi." };
    }
    await deleteByKind(kind, id);
    await createForTargetType(targetType, {
      amount,
      note,
      time: time ?? new Date(),
      recordedByUserId: original.recordedByUserId,
      attachmentUrls: original.attachmentUrls,
      method: String(formData.get("method") || ""),
      platform: String(formData.get("platform") || ""),
      category: String(formData.get("category") || ""),
      transferAccount:
        String(formData.get("transferAccount") || "") === "TIEN" || String(formData.get("transferAccount") || "") === "VAN"
          ? (String(formData.get("transferAccount")) as "TIEN" | "VAN")
          : null,
      roomOrGuest: String(formData.get("roomOrGuest") || ""),
      content: String(formData.get("content") || ""),
    });
    await checkCashAndMaybeAlert();
    revalidatePath("/bao-cao/chi-tiet");
    revalidatePath("/bao-cao");
    revalidatePath("/so-thu-chi");
    revalidatePath("/ghi-nhan");
    revalidatePath("/ban-giao-ca");
    return { ok: true };
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
