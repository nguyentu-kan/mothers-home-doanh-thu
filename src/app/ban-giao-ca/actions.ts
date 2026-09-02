"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { isManager } from "@/lib/permissions";
import { getCashBaseline, sumCashSince, checkCashAndMaybeAlert } from "@/lib/cash";

export type HandoverFormState = { error: string } | undefined;

export async function createHandoverAction(
  _prevState: HandoverFormState,
  formData: FormData
): Promise<HandoverFormState> {
  const session = await requireSession();

  const existingOpen = await prisma.shiftHandover.findFirst({
    where: { OR: [{ handoverConfirmed: false }, { receiverConfirmed: false }] },
  });
  if (existingOpen) {
    return { error: "Đang có 1 ca chưa được xác nhận xong. Vui lòng hoàn tất ca đó trước." };
  }

  const shiftType = String(formData.get("shiftType") || "");
  const receiverUserId = String(formData.get("receiverUserId") || "");
  const cashEndCounted = parseInt(String(formData.get("cashEndCounted") || ""), 10);
  const pendingNotes = String(formData.get("pendingNotes") || "").trim() || null;

  if (!["SANG", "CHIEU", "DEM"].includes(shiftType)) {
    return { error: "Vui lòng chọn ca." };
  }
  if (!receiverUserId) {
    return { error: "Vui lòng chọn người nhận ca." };
  }
  if (receiverUserId === session.userId) {
    return { error: "Người nhận ca phải khác người giao ca." };
  }
  if (!Number.isFinite(cashEndCounted)) {
    return { error: "Vui lòng nhập số tiền đếm thực tế." };
  }

  const { baselineAmount, periodStart } = await getCashBaseline();
  const { cafeRevenue, spaRevenue, roomRevenue, otherExpense, ownerCashOut } = await sumCashSince(periodStart);
  const cashEndCalculated = baselineAmount + cafeRevenue + spaRevenue + roomRevenue - otherExpense - ownerCashOut;

  await prisma.shiftHandover.create({
    data: {
      shiftType: shiftType as "SANG" | "CHIEU" | "DEM",
      periodStart,
      handoverUserId: session.userId,
      receiverUserId,
      cashStart: baselineAmount,
      roomRevenue,
      cafeRevenue,
      spaRevenue,
      otherExpense,
      ownerCashOut,
      cashEndCalculated,
      cashEndCounted,
      pendingNotes,
      handoverConfirmed: true,
      handoverConfirmedAt: new Date(),
      receiverConfirmed: false,
    },
  });

  revalidatePath("/ban-giao-ca");
  revalidatePath("/");
  return undefined;
}

export async function confirmReceiveAction(formData: FormData) {
  const session = await requireSession();
  const handoverId = String(formData.get("handoverId") || "");

  const handover = await prisma.shiftHandover.findUnique({ where: { id: handoverId } });
  if (!handover) return;

  const allowed = handover.receiverUserId === session.userId || isManager(session.role);
  if (!allowed) return;

  await prisma.shiftHandover.update({
    where: { id: handoverId },
    data: { receiverConfirmed: true, receiverConfirmedAt: new Date() },
  });

  await checkCashAndMaybeAlert();
  revalidatePath("/ban-giao-ca");
  revalidatePath("/");
}
