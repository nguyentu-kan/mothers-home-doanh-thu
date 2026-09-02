"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { canManageCashbook } from "@/lib/permissions";
import { checkCashAndMaybeAlert } from "@/lib/cash";
import { parseQuickCapture, type DraftEntry } from "@/lib/gemini";

async function requireCashbookAccess() {
  const session = await requireSession();
  if (!canManageCashbook(session)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}

export type ParseState = { ok: true; entries: DraftEntry[] } | { ok: false; error: string } | undefined;

export async function parseQuickCaptureAction(_prevState: ParseState, formData: FormData): Promise<ParseState> {
  await requireCashbookAccess();

  const text = String(formData.get("text") || "");
  const files = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);

  const images = await Promise.all(
    files.map(async (file) => ({
      data: Buffer.from(await file.arrayBuffer()).toString("base64"),
      mimeType: file.type || "image/jpeg",
    }))
  );

  const result = await parseQuickCapture({ images, text });
  if ("error" in result) {
    return { ok: false, error: result.error };
  }
  return { ok: true, entries: result.entries };
}

const EXPENSE_NOTE_FALLBACK: Record<string, string> = {
  CHI_MAT_BANG: "Chi mặt bằng",
  CHI_LUONG: "Chi lương",
  CHI_MUA_HANG: "Chi mua hàng",
  CHI_KHAC: "Chi khác",
};

export async function confirmQuickCaptureAction(
  entries: DraftEntry[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireCashbookAccess();

  if (!Array.isArray(entries) || entries.length === 0) {
    return { ok: false, error: "Không có khoản nào để lưu." };
  }

  for (const entry of entries) {
    if (!Number.isFinite(entry.amount) || entry.amount <= 0) {
      return { ok: false, error: "Có khoản số tiền không hợp lệ, vui lòng kiểm tra lại." };
    }
  }

  await Promise.all(
    entries.map((entry) => {
      const time = entry.date ? new Date(entry.date) : new Date();

      if (entry.type === "ROOM_TIEN_MAT" || entry.type === "ROOM_CHUYEN_KHOAN") {
        return prisma.roomRevenueEntry.create({
          data: {
            amount: entry.amount,
            method: entry.type === "ROOM_TIEN_MAT" ? "TIEN_MAT" : "CHUYEN_KHOAN",
            note: entry.note || null,
            time,
            recordedByUserId: session.userId,
          },
        });
      }

      if (entry.type === "OTA") {
        return prisma.otaReceivable.create({
          data: {
            amount: entry.amount,
            platform: "KHAC",
            note: entry.note || null,
            date: time,
            recordedByUserId: session.userId,
          },
        });
      }

      if (entry.type === "CON_THU") {
        return prisma.pendingReceivable.create({
          data: {
            amount: entry.amount,
            note: entry.note || null,
            time,
            recordedByUserId: session.userId,
          },
        });
      }

      const category = entry.type.replace("CHI_", "") as "MAT_BANG" | "LUONG" | "MUA_HANG" | "KHAC";
      return prisma.expense.create({
        data: {
          amount: entry.amount,
          category,
          method: "TIEN_MAT",
          note: entry.note || EXPENSE_NOTE_FALLBACK[entry.type],
          time,
          recordedByUserId: session.userId,
        },
      });
    })
  );

  await checkCashAndMaybeAlert();
  revalidatePath("/so-thu-chi");

  return { ok: true };
}
