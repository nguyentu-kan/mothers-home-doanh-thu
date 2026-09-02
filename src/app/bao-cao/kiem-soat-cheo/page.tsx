import Header from "@/components/Header";
import ReportTabs from "@/components/ReportTabs";
import { getCashbookSummary } from "@/lib/summary";
import { formatVnd, formatDateVn } from "@/lib/format";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, format } from "date-fns";

export default async function KiemSoatCheoPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const defaultFrom = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const defaultTo = format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");

  const fromStr = typeof params.from === "string" && params.from ? params.from : defaultFrom;
  const toStr = typeof params.to === "string" && params.to ? params.to : defaultTo;
  const reportedStr = typeof params.reported === "string" ? params.reported : "";

  const from = startOfDay(new Date(fromStr));
  const to = endOfDay(new Date(toStr));
  const summary = await getCashbookSummary(from, to);

  const reported = reportedStr ? parseInt(reportedStr, 10) : null;
  const diff = reported !== null ? reported - summary.totalThu : null;

  return (
    <>
      <Header />
      <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full flex flex-col gap-4">
        <h1 className="text-xl font-extrabold text-[#1B3A5C] dark:text-white">Báo cáo</h1>
        <ReportTabs active="/bao-cao/kiem-soat-cheo" />

        <p className="text-sm text-slate-500">
          Đối chiếu độc lập: so sánh tổng doanh thu người thu ngân (vd. chị Tiên) báo cáo tay với tổng hệ thống tự
          cộng dồn từ dữ liệu ghi nhận.
        </p>

        <form method="get" className="card flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label" htmlFor="from">
                Từ ngày
              </label>
              <input id="from" name="from" type="date" defaultValue={fromStr} className="field-input" />
            </div>
            <div>
              <label className="field-label" htmlFor="to">
                Đến ngày
              </label>
              <input id="to" name="to" type="date" defaultValue={toStr} className="field-input" />
            </div>
          </div>
          <div>
            <label className="field-label" htmlFor="reported">
              Số người thu ngân báo cáo
            </label>
            <input
              id="reported"
              name="reported"
              type="number"
              defaultValue={reportedStr}
              className="field-input text-xl font-bold"
              placeholder="Nhập số để so sánh"
            />
          </div>
          <button type="submit" className="btn-big bg-[#1B3A5C]">
            So sánh
          </button>
        </form>

        <div className="card">
          <div className="text-sm text-slate-500 mb-2">
            {formatDateVn(from)} – {formatDateVn(to)}
          </div>
          <Row label="Tổng hệ thống tự cộng" value={summary.totalThu} bold />
          {reported !== null && (
            <>
              <Row label="Số người thu ngân báo cáo" value={reported} bold />
              <div
                className={`mt-3 rounded-xl px-4 py-3 font-bold text-center ${
                  diff === 0 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                }`}
              >
                {diff === 0 ? "✅ Khớp số" : `🛑 Lệch ${formatVnd(Math.abs(diff ?? 0))} — cần kiểm tra lại`}
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}

function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className={`flex justify-between py-1 ${bold ? "font-bold" : ""}`}>
      <span>{label}</span>
      <span>{formatVnd(value)}</span>
    </div>
  );
}
