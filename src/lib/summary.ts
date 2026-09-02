import { prisma } from "@/lib/prisma";
import { eachDayOfInterval, startOfDay, endOfDay, format } from "date-fns";

export type CashbookSummary = {
  from: Date;
  to: Date;
  roomTienMat: number;
  roomChuyenKhoan: number;
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

  const [roomTM, roomCK, ota, cafe, spa, expenses] = await Promise.all([
    prisma.roomRevenueEntry.aggregate({ _sum: { amount: true }, where: { method: "TIEN_MAT", time: timeFilter } }),
    prisma.roomRevenueEntry.aggregate({ _sum: { amount: true }, where: { method: "CHUYEN_KHOAN", time: timeFilter } }),
    prisma.otaReceivable.aggregate({ _sum: { amount: true }, where: { date: timeFilter } }),
    prisma.serviceRecord.aggregate({ _sum: { amount: true }, where: { category: "CA_PHE", time: timeFilter } }),
    prisma.serviceRecord.aggregate({ _sum: { amount: true }, where: { category: "SPA", time: timeFilter } }),
    prisma.expense.groupBy({ by: ["category"], _sum: { amount: true }, where: { time: timeFilter } }),
  ]);

  const expenseMap = Object.fromEntries(expenses.map((e) => [e.category, e._sum.amount ?? 0]));

  const roomTienMat = roomTM._sum.amount ?? 0;
  const roomChuyenKhoan = roomCK._sum.amount ?? 0;
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

// Giới hạn tối đa 62 ngày (2 tháng) để tránh quá nhiều truy vấn cùng lúc trên dashboard.
export async function getDailyRevenueSeries(from: Date, to: Date): Promise<DailyRevenuePoint[]> {
  const days = eachDayOfInterval({ start: from, end: to }).slice(0, 62);

  const points = await Promise.all(
    days.map(async (day) => {
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);
      const summary = await getCashbookSummary(dayStart, dayEnd);
      return {
        date: format(day, "dd/MM"),
        Phòng: summary.roomTienMat + summary.roomChuyenKhoan,
        "Cà phê": summary.cafe,
        Spa: summary.spa,
        OTA: summary.ota,
      };
    })
  );

  return points;
}
