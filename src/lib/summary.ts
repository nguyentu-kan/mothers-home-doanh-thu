import { prisma } from "@/lib/prisma";
import { eachDayOfInterval, format } from "date-fns";

export type CashbookSummary = {
  from: Date;
  to: Date;
  roomTienMat: number;
  roomChuyenKhoan: number;
  // Trong tổng chuyển khoản trên, phần nào đang nằm ở TK cá nhân Ngọc Tiên — cần chuyển tiếp cho Cô Vân.
  roomChuyenKhoanTaiKhoanTien: number;
  ota: number;
  cafe: number;
  spa: number;
  totalThu: number;
  chiMatBang: number;
  chiLuong: number;
  chiMuaHang: number;
  chiKhac: number;
  totalChi: number;
  chenhLech: number;
};

export async function getCashbookSummary(from: Date, to: Date): Promise<CashbookSummary> {
  const timeFilter = { gte: from, lte: to };

  const [roomTM, roomCK, roomCKTien, ota, cafe, spa, expenses] = await Promise.all([
    prisma.roomRevenueEntry.aggregate({ _sum: { amount: true }, where: { method: "TIEN_MAT", time: timeFilter } }),
    prisma.roomRevenueEntry.aggregate({ _sum: { amount: true }, where: { method: "CHUYEN_KHOAN", time: timeFilter } }),
    prisma.roomRevenueEntry.aggregate({
      _sum: { amount: true },
      where: { method: "CHUYEN_KHOAN", transferAccount: "TIEN", time: timeFilter },
    }),
    prisma.otaReceivable.aggregate({ _sum: { amount: true }, where: { date: timeFilter } }),
    prisma.serviceRecord.aggregate({ _sum: { amount: true }, where: { category: "CA_PHE", time: timeFilter } }),
    prisma.serviceRecord.aggregate({ _sum: { amount: true }, where: { category: "SPA", time: timeFilter } }),
    prisma.expense.groupBy({ by: ["category"], _sum: { amount: true }, where: { time: timeFilter } }),
  ]);

  const expenseMap = Object.fromEntries(expenses.map((e) => [e.category, e._sum.amount ?? 0]));

  const roomTienMat = roomTM._sum.amount ?? 0;
  const roomChuyenKhoan = roomCK._sum.amount ?? 0;
  const roomChuyenKhoanTaiKhoanTien = roomCKTien._sum.amount ?? 0;
  const otaAmount = ota._sum.amount ?? 0;
  const cafeAmount = cafe._sum.amount ?? 0;
  const spaAmount = spa._sum.amount ?? 0;
  const chiMatBang = expenseMap["MAT_BANG"] ?? 0;
  const chiLuong = expenseMap["LUONG"] ?? 0;
  const chiMuaHang = expenseMap["MUA_HANG"] ?? 0;
  const chiKhac = expenseMap["KHAC"] ?? 0;

  const totalThu = roomTienMat + roomChuyenKhoan + otaAmount + cafeAmount + spaAmount;
  const totalChi = chiMatBang + chiLuong + chiMuaHang + chiKhac;

  return {
    from,
    to,
    roomTienMat,
    roomChuyenKhoan,
    roomChuyenKhoanTaiKhoanTien,
    ota: otaAmount,
    cafe: cafeAmount,
    spa: spaAmount,
    totalThu,
    chiMatBang,
    chiLuong,
    chiMuaHang,
    chiKhac,
    totalChi,
    chenhLech: totalThu - totalChi,
  };
}

export type DailyRevenuePoint = { date: string; Phòng: number; "Cà phê": number; Spa: number; OTA: number };

// Giới hạn tối đa 62 ngày (2 tháng) hiển thị trên biểu đồ.
// Lấy dữ liệu thô bằng 4 truy vấn cố định (không phụ thuộc số ngày) rồi gộp theo ngày ở phía code —
// tránh lặp truy vấn cho từng ngày (trước đây làm nghẽn connection pool khi xem khoảng thời gian dài).
export async function getDailyRevenueSeries(from: Date, to: Date): Promise<DailyRevenuePoint[]> {
  const days = eachDayOfInterval({ start: from, end: to }).slice(0, 62);
  const timeFilter = { gte: from, lte: to };

  const [roomRows, otaRows, serviceRows] = await Promise.all([
    prisma.roomRevenueEntry.findMany({ where: { time: timeFilter }, select: { time: true, amount: true } }),
    prisma.otaReceivable.findMany({ where: { date: timeFilter }, select: { date: true, amount: true } }),
    prisma.serviceRecord.findMany({
      where: { time: timeFilter, category: { in: ["CA_PHE", "SPA"] } },
      select: { time: true, amount: true, category: true },
    }),
  ]);

  const roomByDay = new Map<string, number>();
  for (const r of roomRows) {
    const key = format(r.time, "yyyy-MM-dd");
    roomByDay.set(key, (roomByDay.get(key) ?? 0) + r.amount);
  }
  const otaByDay = new Map<string, number>();
  for (const r of otaRows) {
    const key = format(r.date, "yyyy-MM-dd");
    otaByDay.set(key, (otaByDay.get(key) ?? 0) + r.amount);
  }
  const cafeByDay = new Map<string, number>();
  const spaByDay = new Map<string, number>();
  for (const r of serviceRows) {
    const key = format(r.time, "yyyy-MM-dd");
    const target = r.category === "CA_PHE" ? cafeByDay : spaByDay;
    target.set(key, (target.get(key) ?? 0) + r.amount);
  }

  return days.map((day) => {
    const key = format(day, "yyyy-MM-dd");
    return {
      date: format(day, "dd/MM"),
      Phòng: roomByDay.get(key) ?? 0,
      "Cà phê": cafeByDay.get(key) ?? 0,
      Spa: spaByDay.get(key) ?? 0,
      OTA: otaByDay.get(key) ?? 0,
    };
  });
}

export type StaffSummaryRow = {
  userId: string;
  name: string;
  recordCount: number;
  totalThu: number;
  totalChi: number;
};

// Gộp theo người ghi trên cả 4 nguồn — trả lời "ai ghi bao nhiêu dòng, tổng bao nhiêu tiền" trong kỳ.
export async function getStaffSummary(from: Date, to: Date): Promise<StaffSummaryRow[]> {
  const timeFilter = { gte: from, lte: to };

  const [services, rooms, otas, expenses, users] = await Promise.all([
    prisma.serviceRecord.groupBy({ by: ["recordedByUserId"], _sum: { amount: true }, _count: true, where: { time: timeFilter } }),
    prisma.roomRevenueEntry.groupBy({ by: ["recordedByUserId"], _sum: { amount: true }, _count: true, where: { time: timeFilter } }),
    prisma.otaReceivable.groupBy({ by: ["recordedByUserId"], _sum: { amount: true }, _count: true, where: { date: timeFilter } }),
    prisma.expense.groupBy({ by: ["recordedByUserId"], _sum: { amount: true }, _count: true, where: { time: timeFilter } }),
    prisma.user.findMany({ select: { id: true, name: true } }),
  ]);

  const nameMap = new Map(users.map((u) => [u.id, u.name]));
  const map = new Map<string, { recordCount: number; totalThu: number; totalChi: number }>();

  function ensure(userId: string) {
    let entry = map.get(userId);
    if (!entry) {
      entry = { recordCount: 0, totalThu: 0, totalChi: 0 };
      map.set(userId, entry);
    }
    return entry;
  }

  for (const s of services) {
    const e = ensure(s.recordedByUserId);
    e.recordCount += s._count;
    e.totalThu += s._sum.amount ?? 0;
  }
  for (const r of rooms) {
    const e = ensure(r.recordedByUserId);
    e.recordCount += r._count;
    e.totalThu += r._sum.amount ?? 0;
  }
  for (const o of otas) {
    const e = ensure(o.recordedByUserId);
    e.recordCount += o._count;
    e.totalThu += o._sum.amount ?? 0;
  }
  for (const x of expenses) {
    const e = ensure(x.recordedByUserId);
    e.recordCount += x._count;
    e.totalChi += x._sum.amount ?? 0;
  }

  return Array.from(map.entries())
    .map(([userId, v]) => ({ userId, name: nameMap.get(userId) ?? "?", ...v }))
    .sort((a, b) => b.totalThu - b.totalChi - (a.totalThu - a.totalChi));
}
