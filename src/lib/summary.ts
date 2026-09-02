import { prisma } from "@/lib/prisma";
import { eachDayOfInterval, format } from "date-fns";

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
