import Header from "@/components/Header";
import ReportTabs from "@/components/ReportTabs";
import RevenueChart from "@/components/RevenueChart";
import { getPeriodRange, type PeriodKey } from "@/lib/period";
import { getCashbookSummary, getDailyRevenueSeries } from "@/lib/summary";
import { formatVnd, formatDateVn } from "@/lib/format";
import PeriodTabs from "@/components/PeriodTabs";
import CustomDateRangeForm from "@/components/CustomDateRangeForm";

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

  const [summary, series] = await Promise.all([getCashbookSummary(from, to), getDailyRevenueSeries(from, to)]);

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
          <span className="font-bold">TỔNG DOANH THU</span>
          <span className="font-extrabold text-xl text-[#1B3A5C] dark:text-white">{formatVnd(summary.totalThu)}</span>
        </div>
        <div className="card flex justify-between items-center">
          <span className="font-bold">TỔNG CHI PHÍ</span>
          <span className="font-extrabold text-xl text-red-600">{formatVnd(summary.totalChi)}</span>
        </div>
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
