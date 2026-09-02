import { prisma } from "@/lib/prisma";
import Header from "@/components/Header";
import CashBanner from "@/components/CashBanner";
import ServiceForm from "./ServiceForm";

export default async function GhiNhanPage() {
  const menuItems = await prisma.menuItem.findMany({
    where: { active: true },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    select: { id: true, category: true, name: true, price: true },
  });

  return (
    <>
      <Header />
      <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full flex flex-col gap-4">
        <h1 className="text-xl font-extrabold text-[#1B3A5C] dark:text-white">Ghi nhận dịch vụ</h1>
        <CashBanner />
        <ServiceForm menuItems={menuItems} />
      </main>
    </>
  );
}
