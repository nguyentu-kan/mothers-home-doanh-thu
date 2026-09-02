import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } from "date-fns";

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
