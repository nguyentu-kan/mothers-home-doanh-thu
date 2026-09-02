import { prisma } from "@/lib/prisma";

export type ActivityRow = {
  time: Date;
  type: string;
  description: string;
  amount: number;
  method: string;
  recordedByName: string;
  attachmentUrls: string[];
};

const PAYMENT_LABEL: Record<string, string> = {
  GHI_PHONG: "Ghi phòng",
  TIEN_MAT: "Tiền mặt",
  CHUYEN_KHOAN: "Chuyển khoản",
};

const PLATFORM_LABEL: Record<string, string> = {
  AGODA: "Agoda",
  CTRIP: "Ctrip",
  BOOKING: "Booking.com",
  KHAC: "Khác",
};

const EXPENSE_CATEGORY_LABEL: Record<string, string> = {
  MAT_BANG: "Mặt bằng",
  LUONG: "Lương",
  MUA_HANG: "Mua hàng",
  KHAC: "Khác",
};

export async function getActivityRows(from: Date, to: Date, userId?: string): Promise<ActivityRow[]> {
  const timeFilter = { gte: from, lte: to };
  const userFilter = userId ? { recordedByUserId: userId } : {};

  const [services, rooms, otas, expenses] = await Promise.all([
    prisma.serviceRecord.findMany({
      where: { time: timeFilter, ...userFilter },
      include: { recordedByUser: true },
      orderBy: { time: "desc" },
    }),
    prisma.roomRevenueEntry.findMany({
      where: { time: timeFilter, ...userFilter },
      include: { recordedByUser: true },
      orderBy: { time: "desc" },
    }),
    prisma.otaReceivable.findMany({
      where: { date: timeFilter, ...userFilter },
      include: { recordedByUser: true },
      orderBy: { date: "desc" },
    }),
    prisma.expense.findMany({
      where: { time: timeFilter, ...userFilter },
      include: { recordedByUser: true },
      orderBy: { time: "desc" },
    }),
  ]);

  const rows: ActivityRow[] = [
    ...services.map((s) => ({
      time: s.time,
      type: s.category === "CA_PHE" ? "Cà phê" : "Spa",
      description: `${s.content} (SL ${s.quantity}) — ${s.roomOrGuest} — ${PAYMENT_LABEL[s.paymentMethod]}`,
      amount: s.amount,
      method: PAYMENT_LABEL[s.paymentMethod],
      recordedByName: s.recordedByUser.name,
      attachmentUrls: [],
    })),
    ...rooms.map((r) => {
      const accountTag =
        r.transferAccount === "TIEN" ? " (TK Tiên)" : r.transferAccount === "VAN" ? " (TK Cô Vân)" : "";
      return {
        time: r.time,
        type: "Thu phòng",
        description: (r.note || "") + accountTag,
        amount: r.amount,
        method: PAYMENT_LABEL[r.method] + accountTag,
        recordedByName: r.recordedByUser.name,
        attachmentUrls: r.attachmentUrls,
      };
    }),
    ...otas.map((o) => ({
      time: o.date,
      type: "OTA công nợ",
      description: `${PLATFORM_LABEL[o.platform]} — ${o.note || ""}`,
      amount: o.amount,
      method: "Công nợ",
      recordedByName: o.recordedByUser.name,
      attachmentUrls: o.attachmentUrls,
    })),
    ...expenses.map((e) => ({
      time: e.time,
      type: "Chi phí",
      description: `${EXPENSE_CATEGORY_LABEL[e.category]} — ${e.note}`,
      amount: -e.amount,
      method: PAYMENT_LABEL[e.method],
      recordedByName: e.recordedByUser.name,
      attachmentUrls: e.attachmentUrls,
    })),
  ];

  return rows.sort((a, b) => b.time.getTime() - a.time.getTime());
}
