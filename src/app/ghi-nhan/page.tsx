import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { startOfDay, endOfDay } from "date-fns";
import Header from "@/components/Header";
import CashBanner from "@/components/CashBanner";
import ServiceForm from "./ServiceForm";
import TodayEntriesList from "./TodayEntriesList";

export default async function GhiNhanPage() {
  const session = await requireSession();
  const now = new Date();

  const [menuItems, todayEntries] = await Promise.all([
    prisma.menuItem.findMany({
      where: { active: true },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
      select: { id: true, category: true, name: true, price: true },
    }),
    prisma.serviceRecord.findMany({
      where: {
        recordedByUserId: session.userId,
        time: { gte: startOfDay(now), lte: endOfDay(now) },
      },
      orderBy: { time: "desc" },
      select: { id: true, time: true, category: true, content: true, roomOrGuest: true, amount: true },
    }),
  ]);

  return (
    <>
      <Header />
      <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full flex flex-col gap-4">
        <h1 className="text-xl font-extrabold text-[#1B3A5C] dark:text-white">Ghi nhận dịch vụ</h1>
        <CashBanner />
        <ServiceForm menuItems={menuItems} />
        <TodayEntriesList entries={todayEntries} />
      </main>
    </>
  );
}
