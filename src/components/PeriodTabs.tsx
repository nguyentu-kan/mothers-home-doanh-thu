import Link from "next/link";
import type { PeriodKey } from "@/lib/period";

const TABS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Hôm nay" },
  { key: "week", label: "Tuần này" },
  { key: "month", label: "Tháng này" },
];

export default function PeriodTabs({ basePath, period }: { basePath: string; period: PeriodKey }) {
  return (
    <div className="flex gap-2">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={`${basePath}?period=${t.key}`}
          className={`flex-1 text-center rounded-xl py-2 font-semibold ${
            period === t.key ? "bg-[#1B3A5C] text-white" : "bg-slate-200 dark:bg-white/10"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
