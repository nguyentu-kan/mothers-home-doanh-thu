import Link from "next/link";
import Header from "@/components/Header";
import ReportTabs from "@/components/ReportTabs";
import RevenueChart from "@/components/RevenueChart";
import { getPeriodRange, getPreviousPeriodRange, computeChangePercent, type PeriodKey } from "@/lib/period";
import {
  getCashbookSummary,
  getDailyRevenueSeries,
  getStaffSummary,
  getPendingReceivablesSummary,
  getOwnerTransferBalance,
} from "@/lib/summary";
import { getCashLimitBreaches } from "@/lib/cash";
import { formatVnd, formatDateVn, formatDateTimeVn } from "@/lib/format";
import PeriodTabs from "@/components/PeriodTabs";
import CustomDateRangeForm from "@/components/CustomDateRangeForm";

const SHIFT_LABEL: Record<string, string> = { SANG: "Sáng", CHIEU: "Chiều", DEM: "Đêm" };

export default async function BaoCaoPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const period = (typeof params.period === "string" ? params.period : "week") as PeriodKey;
  const fromParam = typeof params.from === "string" ? params.from : undefined;
  const toParam = typeof params.to === "string" ? params.to : undefined;
  const { from, to } = getPeriodRange(period, fromParam, toParam);
  const prevRange = getPreviousPeriodRange(period, from, to);

  const [summary, series, prevSummary, breaches, staff, pendingReceivables, ownerTransferBalance] = await Promise.all([
    getCashbookSummary(from, to),
    getDailyRevenueSeries(from, to),
    getCashbookSummary(prevRange.from, prevRange.to),
    getCashLimitBreaches(from, to),
    getStaffSummary(from, to),
    getPendingReceivablesSummary(),
    getOwnerTransferBalance(),
  ]);

  const thuChangePct = computeChangePercent(summary.totalThu, prevSummary.totalThu);
  const chiChangePct = computeChangePercent(summary.totalChi, prevSummary.totalChi);

  const rangeQuery =
    period === "custom" && fromParam && toParam ? `period=custom&from=${fromParam}&to=${toParam}` : `period=${period}`;

  return (
    <>
      <Header />
      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full flex flex-col gap-4">
        <h1 className="text-xl font-extrabold text-[#1B3A5C] dark:text-white">Báo cáo</h1>
        <ReportTabs active="/bao-cao" />
        <PeriodTabs basePath="/bao-cao" period={period} />
        <div className="card">
          <CustomDateRangeForm from={fromParam} to={toParam} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link href={`/bao-cao/in?${rangeQuery}`} className="rounded-xl py-3 text-center font-semibold bg-slate-600 text-white">
            🖨️ In báo cáo đầy đủ
          </Link>
          <a
            href={`/bao-cao/export-images?${rangeQuery}`}
            className="rounded-xl py-3 text-center font-semibold bg-slate-600 text-white"
          >
            🗂️ Tải ảnh chứng từ (ZIP)
          </a>
        </div>
        <p className="text-xs text-slate-400 text-center -mt-2">
          File tải về sẽ tự lưu vào mục &quot;Tải xuống&quot; (Downloads) hoặc app &quot;Files&quot; trên điện thoại/máy
          tính — mở app đó lên là thấy.
        </p>

        <div className="card">
          <div className="text-sm text-slate-500 mb-2">
            {formatDateVn(from)} – {formatDateVn(to)}
          </div>
          <RevenueChart data={series} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Phòng" value={summary.roomTienMat + summary.roomChuyenKhoan} color="#1B3A5C" />
          <StatCard label="OTA công nợ" value={summary.ota} color="#7C3AED" />
          <StatCard label="Cà phê & Nước" value={summary.cafe} color="#B45309" />
          <StatCard label="Spa" value={summary.spa} color="#0E7C66" />
        </div>

        <div className="card flex justify-between items-center">
          <div>
            <span className="font-bold">TỔNG DOANH THU</span>
            <ChangeBadge pct={thuChangePct} goodDirection="up" />
          </div>
          <span className="font-extrabold text-xl text-[#1B3A5C] dark:text-white">{formatVnd(summary.totalThu)}</span>
        </div>
        <div className="card flex justify-between items-center">
          <div>
            <span className="font-bold">TỔNG CHI PHÍ</span>
            <ChangeBadge pct={chiChangePct} goodDirection="down" />
          </div>
          <span className="font-extrabold text-xl text-red-600">{formatVnd(summary.totalChi)}</span>
        </div>
        <p className="text-xs text-slate-400 -mt-2">
          So với kỳ trước ({formatDateVn(prevRange.from)} – {formatDateVn(prevRange.to)})
        </p>

        <div className="card">
          <div className="font-bold text-[#1B3A5C] dark:text-white mb-2">⚠️ Vượt hạn mức tiền mặt</div>
          {breaches.length === 0 ? (
            <p className="text-sm text-emerald-700">Không có lần nào vượt hạn mức trong kỳ này.</p>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {breaches.length} lần vượt hạn mức ({breaches.filter((b) => b.level === "DANGER").length} lần mức đỏ).
              </p>
              {breaches.map((b, i) => (
                <div
                  key={i}
                  className={`flex justify-between text-sm rounded-lg px-3 py-2 ${
                    b.level === "DANGER" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-900"
                  }`}
                >
                  <span>
                    {formatDateVn(b.date)} — Ca {SHIFT_LABEL[b.shiftType]}
                  </span>
                  <span className="font-semibold">{formatVnd(b.cashEndCounted)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="font-bold text-[#1B3A5C] dark:text-white mb-2">📋 Còn phải thu (hiện tại)</div>
          {pendingReceivables.count === 0 ? (
            <p className="text-sm text-emerald-700">Không có khoản nào đang chờ thu.</p>
          ) : (
            <>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">
                {pendingReceivables.count} khoản, tổng{" "}
                <span className="font-bold text-amber-700 dark:text-amber-400">{formatVnd(pendingReceivables.total)}</span>
              </p>
              <div className="flex flex-col gap-1">
                {pendingReceivables.items.map((i) => (
                  <div key={i.id} className="flex justify-between text-sm rounded-lg px-3 py-2 bg-amber-100 dark:bg-amber-900/30">
                    <span>
                      {formatDateVn(i.time)} — {i.note || "(không ghi chú)"} — {i.recordedByName}
                    </span>
                    <span className="font-semibold">{formatVnd(i.amount)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="card">
          <div className="font-bold text-[#1B3A5C] dark:text-white mb-2">🔁 Chuyển tiếp cho Cô Vân</div>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">
            Đã nhận vào TK Tiên: {formatVnd(ownerTransferBalance.received)} — Đã chuyển:{" "}
            {formatVnd(ownerTransferBalance.forwarded)}
          </p>
          {ownerTransferBalance.outstanding > 0 ? (
            <p className="text-sm font-bold text-amber-700 dark:text-amber-400 mb-2">
              Còn cần chuyển: {formatVnd(ownerTransferBalance.outstanding)}
            </p>
          ) : (
            <p className="text-sm text-emerald-700 mb-2">Đã chuyển đủ, không còn thiếu.</p>
          )}
          {ownerTransferBalance.transfers.length > 0 && (
            <div className="flex flex-col gap-1">
              {ownerTransferBalance.transfers.map((t) => (
                <div key={t.id} className="flex justify-between text-sm rounded-lg px-3 py-2 bg-slate-100 dark:bg-white/5">
                  <span>
                    {formatDateVn(t.time)} — {t.note || "(không ghi chú)"} — {t.recordedByName}
                    {t.attachmentUrls.length > 0 && (
                      <>
                        {" — "}
                        {t.attachmentUrls.map((url, i) => (
                          <a
                            key={url}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline font-semibold"
                          >
                            📎{t.attachmentUrls.length > 1 ? i + 1 : ""}{" "}
                          </a>
                        ))}
                      </>
                    )}
                  </span>
                  <span className="font-semibold">{formatVnd(t.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card overflow-x-auto">
          <div className="font-bold text-[#1B3A5C] dark:text-white mb-2">👥 Theo nhân viên</div>
          {staff.length === 0 ? (
            <p className="text-sm text-slate-500">Chưa có dữ liệu trong kỳ này.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-black/10 dark:border-white/10">
                  <th className="py-1 pr-2">Nhân viên</th>
                  <th className="py-1 pr-2 text-right">Số dòng</th>
                  <th className="py-1 pr-2 text-right">Tổng thu</th>
                  <th className="py-1 pr-2 text-right">Tổng chi</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => (
                  <tr key={s.userId} className="border-b border-black/5 dark:border-white/5">
                    <td className="py-1 pr-2">{s.name}</td>
                    <td className="py-1 pr-2 text-right">{s.recordCount}</td>
                    <td className="py-1 pr-2 text-right">{formatVnd(s.totalThu)}</td>
                    <td className="py-1 pr-2 text-right text-red-600">{formatVnd(s.totalChi)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="text-xs text-slate-400 text-center">Cập nhật lúc {formatDateTimeVn(new Date())}</p>
      </main>
    </>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="card">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="font-extrabold text-lg" style={{ color }}>
        {formatVnd(value)}
      </div>
    </div>
  );
}

function ChangeBadge({ pct, goodDirection }: { pct: number | null; goodDirection: "up" | "down" }) {
  if (pct === null) return null;
  const isUp = pct >= 0;
  const isGood = isUp ? goodDirection === "up" : goodDirection === "down";
  return (
    <span className={`ml-2 text-xs font-semibold ${isGood ? "text-emerald-600" : "text-red-600"}`}>
      {isUp ? "▲" : "▼"} {Math.abs(pct).toFixed(0)}%
    </span>
  );
}
