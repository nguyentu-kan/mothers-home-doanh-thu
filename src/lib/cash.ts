import { prisma } from "@/lib/prisma";
import { sendCashDangerEmail } from "@/lib/mailer";

export type CashAlertLevel = "OK" | "WARNING" | "DANGER";

const DEFAULT_WARNING_THRESHOLD = 3_000_000;
const DEFAULT_DANGER_THRESHOLD = 5_000_000;

async function getLastConfirmedHandover() {
  return prisma.shiftHandover.findFirst({
    where: { handoverConfirmed: true, receiverConfirmed: true },
    orderBy: { receiverConfirmedAt: "desc" },
  });
}

// Mốc & số dư tiền mặt "đầu kỳ" hiện tại = số đếm thực tế của ca gần nhất đã được cả 2 bên xác nhận.
// Nếu app mới dùng, chưa có ca nào xác nhận thì lấy từ AppSetting "initial_cash" (Quản lý nhập khi khởi tạo).
export async function getCashBaseline(): Promise<{ baselineAmount: number; periodStart: Date }> {
  const last = await getLastConfirmedHandover();
  if (last && last.cashEndCounted != null && last.receiverConfirmedAt) {
    return { baselineAmount: last.cashEndCounted, periodStart: last.receiverConfirmedAt };
  }
  const [initialCashSetting, genesisSetting] = await Promise.all([
    prisma.appSetting.findUnique({ where: { key: "initial_cash" } }),
    prisma.appSetting.findUnique({ where: { key: "genesis_date" } }),
  ]);
  return {
    baselineAmount: initialCashSetting ? parseInt(initialCashSetting.value, 10) : 0,
    periodStart: genesisSetting ? new Date(genesisSetting.value) : new Date(0),
  };
}

// Tổng hợp Thu/Chi tiền mặt phát sinh kể từ 1 mốc thời gian — dùng chung cho:
// - Chức năng 2: tính số cho ca đang mở (periodStart = mốc ca trước)
// - Chức năng 3: tính tiền mặt tại quầy hiện tại (periodStart = baseline hiện tại)
export async function sumCashSince(periodStart: Date, until: Date = new Date()) {
  const [cafeSum, spaSum, roomSum, expenseSum] = await Promise.all([
    prisma.serviceRecord.aggregate({
      _sum: { amount: true },
      where: { paymentMethod: "TIEN_MAT", category: "CA_PHE", time: { gt: periodStart, lte: until } },
    }),
    prisma.serviceRecord.aggregate({
      _sum: { amount: true },
      where: { paymentMethod: "TIEN_MAT", category: "SPA", time: { gt: periodStart, lte: until } },
    }),
    prisma.roomRevenueEntry.aggregate({
      _sum: { amount: true },
      where: { method: "TIEN_MAT", time: { gt: periodStart, lte: until } },
    }),
    prisma.expense.aggregate({
      _sum: { amount: true },
      where: { method: "TIEN_MAT", time: { gt: periodStart, lte: until } },
    }),
  ]);
  return {
    cafeRevenue: cafeSum._sum.amount ?? 0,
    spaRevenue: spaSum._sum.amount ?? 0,
    roomRevenue: roomSum._sum.amount ?? 0,
    otherExpense: expenseSum._sum.amount ?? 0,
  };
}

export async function computeCashOnHand(): Promise<{ amount: number; periodStart: Date }> {
  const { baselineAmount, periodStart } = await getCashBaseline();
  const { cafeRevenue, spaRevenue, roomRevenue, otherExpense } = await sumCashSince(periodStart);
  const amount = baselineAmount + cafeRevenue + spaRevenue + roomRevenue - otherExpense;
  return { amount, periodStart };
}

export async function getCashThresholds() {
  const settings = await prisma.appSetting.findMany({
    where: {
      key: { in: ["cash_warning_threshold", "cash_danger_threshold", "manager_alert_email"] },
    },
  });
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  return {
    warning: map.cash_warning_threshold ? parseInt(map.cash_warning_threshold, 10) : DEFAULT_WARNING_THRESHOLD,
    danger: map.cash_danger_threshold ? parseInt(map.cash_danger_threshold, 10) : DEFAULT_DANGER_THRESHOLD,
    managerEmail: map.manager_alert_email ?? process.env.MANAGER_ALERT_EMAIL ?? "",
  };
}

export function classifyCashLevel(amount: number, warning: number, danger: number): CashAlertLevel {
  if (amount > danger) return "DANGER";
  if (amount > warning) return "WARNING";
  return "OK";
}

// Gọi sau mỗi lần lưu Chức năng 1 / Sổ Thu Chi / Chức năng 2 — tính lại tiền mặt tại quầy,
// và chỉ gửi email khi VỪA chuyển sang mức DANGER (tránh gửi lặp lại liên tục khi vẫn còn vượt mức).
export async function checkCashAndMaybeAlert() {
  const { amount } = await computeCashOnHand();
  const { warning, danger, managerEmail } = await getCashThresholds();
  const level = classifyCashLevel(amount, warning, danger);

  const flagKey = "cash_danger_alert_sent";
  if (level === "DANGER") {
    const flag = await prisma.appSetting.findUnique({ where: { key: flagKey } });
    if (flag?.value !== "1") {
      if (managerEmail) {
        await sendCashDangerEmail(managerEmail, amount).catch((err) => {
          console.error("Gửi email cảnh báo thất bại:", err);
        });
      }
      await prisma.appSetting.upsert({
        where: { key: flagKey },
        update: { value: "1" },
        create: { key: flagKey, value: "1" },
      });
    }
  } else {
    await prisma.appSetting.upsert({
      where: { key: flagKey },
      update: { value: "0" },
      create: { key: flagKey, value: "0" },
    });
  }

  return { amount, level, warning, danger };
}
