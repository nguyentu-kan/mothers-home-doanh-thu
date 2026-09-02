import Header from "@/components/Header";
import ReportTabs from "@/components/ReportTabs";
import PeriodTabs from "@/components/PeriodTabs";
import { getPeriodRange, type PeriodKey } from "@/lib/period";
import { getActivityRows } from "@/lib/activity";
import { prisma } from "@/lib/prisma";
import { formatVnd, formatDateTimeVn } from "@/lib/format";

export default async function ChiTietPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const period = (typeof params.period === "string" ? params.period : "week") as PeriodKey;
  const userId = typeof params.userId === "string" ? params.userId : "";
  const { from, to } = getPeriodRange(period);

  const [rows, users] = await Promise.all([
    getActivityRows(from, to, userId || undefined),
    prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const exportHref = `/bao-cao/export?period=${period}${userId ? `&userId=${userId}` : ""}`;

  return (
    <>
      <Header />
      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full flex flex-col gap-4">
        <h1 className="text-xl font-extrabold text-[#1B3A5C] dark:text-white">Báo cáo</h1>
        <ReportTabs active="/bao-cao/chi-tiet" />
        <PeriodTabs basePath="/bao-cao/chi-tiet" period={period} />

        <form method="get" className="flex gap-2 items-center">
          <input type="hidden" name="period" value={period} />
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

        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-black/10 dark:border-white/10">
                <th className="py-2 pr-2">Thời gian</th>
                <th className="py-2 pr-2">Loại</th>
                <th className="py-2 pr-2">Nội dung</th>
                <th className="py-2 pr-2 text-right">Số tiền</th>
                <th className="py-2 pr-2">Người ghi</th>
                <th className="py-2 pr-2">Chứng từ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-black/5 dark:border-white/5">
                  <td className="py-2 pr-2 whitespace-nowrap">{formatDateTimeVn(r.time)}</td>
                  <td className="py-2 pr-2 whitespace-nowrap">{r.type}</td>
                  <td className="py-2 pr-2">{r.description}</td>
                  <td className={`py-2 pr-2 text-right whitespace-nowrap ${r.amount < 0 ? "text-red-600" : ""}`}>
                    {formatVnd(r.amount)}
                  </td>
                  <td className="py-2 pr-2 whitespace-nowrap">{r.recordedByName}</td>
                  <td className="py-2 pr-2 whitespace-nowrap">
                    {r.attachmentUrl ? (
                      <a
                        href={r.attachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline font-semibold"
                      >
                        📎 Xem ảnh
                      </a>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-slate-500">
                    Không có dữ liệu trong khoảng thời gian này.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
