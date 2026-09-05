import Header from "@/components/Header";
import ReportTabs from "@/components/ReportTabs";
import PeriodTabs from "@/components/PeriodTabs";
import CustomDateRangeForm from "@/components/CustomDateRangeForm";
import ChiTietTable from "./ChiTietTable";
import { getPeriodRange, type PeriodKey } from "@/lib/period";
import { getActivityRows } from "@/lib/activity";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { isAppAdmin } from "@/lib/permissions";
import { formatDateVn } from "@/lib/format";

export default async function ChiTietPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const period = (typeof params.period === "string" ? params.period : "week") as PeriodKey;
  const userId = typeof params.userId === "string" ? params.userId : "";
  const fromParam = typeof params.from === "string" ? params.from : undefined;
  const toParam = typeof params.to === "string" ? params.to : undefined;
  const { from, to } = getPeriodRange(period, fromParam, toParam);

  const [rows, users, session] = await Promise.all([
    getActivityRows(from, to, userId || undefined),
    prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    getSession(),
  ]);
  const canEdit = isAppAdmin(session);

  const rangeQuery =
    period === "custom" && fromParam && toParam
      ? `period=custom&from=${fromParam}&to=${toParam}`
      : `period=${period}`;
  const exportHref = `/bao-cao/export?${rangeQuery}${userId ? `&userId=${userId}` : ""}`;

  return (
    <>
      <Header />
      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full flex flex-col gap-4">
        <h1 className="text-xl font-extrabold text-[#1B3A5C] dark:text-white">Báo cáo</h1>
        <ReportTabs active="/bao-cao/chi-tiet" />
        <PeriodTabs basePath="/bao-cao/chi-tiet" period={period} />
        <div className="card">
          <CustomDateRangeForm from={fromParam} to={toParam} />
        </div>
        <div className="text-sm text-slate-500">
          {formatDateVn(from)} – {formatDateVn(to)}
        </div>

        <form method="get" className="flex gap-2 items-center">
          <input type="hidden" name="period" value={period} />
          {period === "custom" && fromParam && <input type="hidden" name="from" value={fromParam} />}
          {period === "custom" && toParam && <input type="hidden" name="to" value={toParam} />}
          <select name="userId" defaultValue={userId} className="field-input flex-1">
            <option value="">-- Tất cả người ghi --</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded-xl px-4 py-3 font-semibold bg-[#1B3A5C] text-white">
            Lọc
          </button>
        </form>

        <a href={exportHref} className="btn-big bg-slate-600 text-center">
          ⬇️ Xuất CSV ({rows.length} dòng)
        </a>
        <p className="text-xs text-slate-400 text-center -mt-2">
          File tải về sẽ tự lưu vào mục &quot;Tải xuống&quot; (Downloads) hoặc app &quot;Files&quot; trên điện thoại/máy
          tính.
        </p>

        <ChiTietTable rows={rows} canEdit={canEdit} />
      </main>
    </>
  );
}
