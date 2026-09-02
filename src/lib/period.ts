import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  parseISO,
  subDays,
  subWeeks,
  subMonths,
  differenceInCalendarDays,
} from "date-fns";

export type PeriodKey = "today" | "week" | "month" | "custom";

export function getPeriodRange(
  period: PeriodKey,
  fromParam?: string,
  toParam?: string
): { from: Date; to: Date } {
  const now = new Date();

  if (period === "week") {
    return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
  }
  if (period === "month") {
    return { from: startOfMonth(now), to: endOfMonth(now) };
  }
  if (period === "custom" && fromParam && toParam) {
    return { from: startOfDay(parseISO(fromParam)), to: endOfDay(parseISO(toParam)) };
  }
  return { from: startOfDay(now), to: endOfDay(now) };
}

// Kỳ liền trước tương ứng — dùng để so sánh "tăng/giảm bao nhiêu % so với kỳ trước" trong Báo cáo.
export function getPreviousPeriodRange(period: PeriodKey, from: Date, to: Date): { from: Date; to: Date } {
  if (period === "week") {
    return { from: startOfWeek(subWeeks(from, 1), { weekStartsOn: 1 }), to: endOfWeek(subWeeks(to, 1), { weekStartsOn: 1 }) };
  }
  if (period === "month") {
    const prevMonthDate = subMonths(from, 1);
    return { from: startOfMonth(prevMonthDate), to: endOfMonth(prevMonthDate) };
  }
  if (period === "custom") {
    const days = differenceInCalendarDays(to, from) + 1;
    return { from: startOfDay(subDays(from, days)), to: endOfDay(subDays(to, days)) };
  }
  // "today"
  return { from: startOfDay(subDays(from, 1)), to: endOfDay(subDays(to, 1)) };
}

// % thay đổi so với kỳ trước — null nếu kỳ trước bằng 0 (không có cơ sở để tính %).
export function computeChangePercent(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}
