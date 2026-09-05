import { prisma } from "@/lib/prisma";

export type ActivityRowKind = "SERVICE" | "ROOM" | "OTA" | "EXPENSE" | "PENDING" | "OWNER_TRANSFER";

// Dữ liệu gốc (chưa định dạng) cần để hiện sẵn trong form sửa — chỉ điền field liên quan tới `kind`.
export type ActivityEditData = {
  amount: number;
  note: string;
  method?: string;
  category?: string;
  platform?: string;
  transferAccount?: string | null;
  roomOrGuest?: string;
  content?: string;
};

export type ActivityRow = {
  id: string;
  kind: ActivityRowKind;
  time: Date;
  type: string;
  description: string;
  amount: number;
  method: string;
  recordedByName: string;
  attachmentUrls: string[];
  editData: ActivityEditData;
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

  const [services, rooms, otas, expenses, pendingReceivables, ownerTransfers] = await Promise.all([
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
    // Chỉ lấy khoản CHƯA thu — khoản đã thu thì tiền thật đã có 1 dòng Thu phòng riêng (ghi chú
    // "đã thu khoản còn nợ"), giữ cả 2 dòng ở đây sẽ trông như bị tính trùng dù tổng vẫn đúng.
    prisma.pendingReceivable.findMany({
      where: { time: timeFilter, ...userFilter, status: "PENDING" },
      include: { recordedByUser: true },
      orderBy: { time: "desc" },
    }),
    prisma.ownerTransfer.findMany({
      where: { time: timeFilter, ...userFilter },
      include: { recordedByUser: true },
      orderBy: { time: "desc" },
    }),
  ]);

  const rows: ActivityRow[] = [
    ...services.map((s) => ({
      id: s.id,
      kind: "SERVICE" as const,
      time: s.time,
      type: s.category === "CA_PHE" ? "Cà phê" : "Spa",
      description: `${s.content} (SL ${s.quantity}) — ${s.roomOrGuest} — ${PAYMENT_LABEL[s.paymentMethod]}`,
      amount: s.amount,
      method: PAYMENT_LABEL[s.paymentMethod],
      recordedByName: s.recordedByUser.name,
      attachmentUrls: [],
      editData: {
        amount: s.amount,
        note: "",
        method: s.paymentMethod,
        category: s.category,
        roomOrGuest: s.roomOrGuest,
        content: s.content,
      },
    })),
    ...rooms.map((r) => {
      const accountTag =
        r.transferAccount === "TIEN" ? " (TK Tiên)" : r.transferAccount === "VAN" ? " (TK Cô Vân)" : "";
      return {
        id: r.id,
        kind: "ROOM" as const,
        time: r.time,
        type: "Thu phòng",
        description: (r.note || "") + accountTag,
        amount: r.amount,
        method: PAYMENT_LABEL[r.method] + accountTag,
        recordedByName: r.recordedByUser.name,
        attachmentUrls: r.attachmentUrls,
        editData: {
          amount: r.amount,
          note: r.note || "",
          method: r.method,
          transferAccount: r.transferAccount,
        },
      };
    }),
    ...otas.map((o) => ({
      id: o.id,
      kind: "OTA" as const,
      time: o.date,
      type: "OTA công nợ",
      description: `${PLATFORM_LABEL[o.platform]} — ${o.note || ""}`,
      amount: o.amount,
      method: "Công nợ",
      recordedByName: o.recordedByUser.name,
      attachmentUrls: o.attachmentUrls,
      editData: {
        amount: o.amount,
        note: o.note || "",
        platform: o.platform,
      },
    })),
    ...expenses.map((e) => ({
      id: e.id,
      kind: "EXPENSE" as const,
      time: e.time,
      type: "Chi phí",
      description: `${EXPENSE_CATEGORY_LABEL[e.category]} — ${e.note}`,
      amount: -e.amount,
      method: PAYMENT_LABEL[e.method],
      recordedByName: e.recordedByUser.name,
      attachmentUrls: e.attachmentUrls,
      editData: {
        amount: e.amount,
        note: e.note,
        method: e.method,
        category: e.category,
      },
    })),
    ...pendingReceivables.map((p) => ({
      id: p.id,
      kind: "PENDING" as const,
      time: p.time,
      type: "Còn phải thu",
      description: (p.note || "") + " (chưa thu)",
      amount: p.amount,
      method: "Chưa thu",
      recordedByName: p.recordedByUser.name,
      attachmentUrls: [],
      editData: {
        amount: p.amount,
        note: p.note || "",
      },
    })),
    ...ownerTransfers.map((t) => ({
      id: t.id,
      kind: "OWNER_TRANSFER" as const,
      time: t.time,
      type: "Chuyển tiếp cho Cô Vân",
      description: t.note || "",
      amount: t.amount,
      method: t.method === "TIEN_MAT" ? "Tiền mặt" : "Chuyển khoản",
      recordedByName: t.recordedByUser.name,
      attachmentUrls: t.attachmentUrls,
      editData: {
        amount: t.amount,
        note: t.note || "",
        method: t.method,
      },
    })),
  ];

  return rows.sort((a, b) => b.time.getTime() - a.time.getTime());
}
