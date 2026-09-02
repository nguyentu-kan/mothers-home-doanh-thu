import Link from "next/link";

const TABS = [
  { href: "/bao-cao", label: "Tổng quan" },
  { href: "/bao-cao/chi-tiet", label: "Chi tiết" },
  { href: "/bao-cao/kiem-soat-cheo", label: "Kiểm soát chéo" },
];

export default function ReportTabs({ active }: { active: string }) {
  return (
    <div className="flex gap-2 overflow-x-auto">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`whitespace-nowrap rounded-xl px-4 py-2 font-semibold ${
            active === t.href ? "bg-[#1B3A5C] text-white" : "bg-slate-200 dark:bg-white/10"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
