import Header from "@/components/Header";
import CashBanner from "@/components/CashBanner";
import BigLinkButton from "@/components/BigLinkButton";
import PrintButton from "@/components/PrintButton";
import PeriodTabs from "@/components/PeriodTabs";
import { getPeriodRange, type PeriodKey } from "@/lib/period";
import { getCashbookSummary } from "@/lib/summary";
import { formatVnd, formatDateVn } from "@/lib/format";

export default async function SoThuChiPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const period = (typeof params.period === "string" ? params.period : "today") as PeriodKey;
  const { from, to } = getPeriodRange(period);
  const summary = await getCashbookSummary(from, to);

  return (
    <>
      <Header />
      <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full flex flex-col gap-4">
        <h1 className="text-xl font-extrabold text-[#1B3A5C] dark:text-white no-print">Sổ Thu Chi</h1>
        <div className="no-print">
          <CashBanner />
        </div>

        <div className="no-print grid grid-cols-3 gap-3">
          <BigLinkButton href="/so-thu-chi/thu-phong" icon="💰" label="Thu phòng" color="#0E7C66" />
          <BigLinkButton href="/so-thu-chi/ota" icon="🌐" label="OTA công nợ" color="#0369A1" />
          <BigLinkButton href="/so-thu-chi/chi-phi" icon="🧾" label="Chi phí" color="#B91C1C" />
        </div>

        <div className="no-print">
          <BigLinkButton href="/so-thu-chi/nhap-nhanh" icon="🤖" label="Nhập nhanh bằng AI" color="#7C3AED" />
        </div>

        <div className="no-print">
          <PeriodTabs basePath="/so-thu-chi" period={period} />
        </div>

        <div className="card">
          <div className="text-center mb-3">
            <div className="font-extrabold text-lg text-[#1B3A5C] dark:text-white">Mother&apos;s Home</div>
            <div className="text-sm text-slate-500">
              {formatDateVn(summary.from)} – {formatDateVn(summary.to)}
            </div>
          </div>

          <div className="font-bold text-[#1B3A5C] dark:text-white mb-1">Thu</div>
          <Row label="Phòng (tiền mặt)" value={summary.roomTienMat} />
          <Row label="Phòng (chuyển khoản)" value={summary.roomChuyenKhoan} />
          <Row label="OTA (công nợ)" value={summary.ota} />
          <Row label="Cà phê & Nước uống" value={summary.cafe} />
          <Row label="Gội đầu & Massage" value={summary.spa} />
          <Row label="TỔNG THU" value={summary.totalThu} bold />

          <div className="font-bold text-[#1B3A5C] dark:text-white mt-4 mb-1">Chi</div>
          <Row label="Mặt bằng" value={summary.chiMatBang} />
          <Row label="Lương" value={summary.chiLuong} />
          <Row label="Mua hàng" value={summary.chiMuaHang} />
          <Row label="Khác" value={summary.chiKhac} />
          <Row label="TỔNG CHI" value={summary.totalChi} bold />

          <div className="border-t border-black/10 dark:border-white/10 mt-4 pt-3 flex justify-between items-center">
            <span className="font-extrabold">Chênh lệch (Thu − Chi)</span>
            <span className={`font-extrabold text-lg ${summary.chenhLech < 0 ? "text-red-600" : "text-emerald-600"}`}>
              {formatVnd(summary.chenhLech)}
            </span>
          </div>
        </div>

        {summary.roomChuyenKhoanTaiKhoanTien > 0 && (
          <div className="no-print rounded-2xl bg-amber-100 dark:bg-amber-900/40 px-4 py-3 flex justify-between items-center">
            <span className="font-semibold text-amber-900 dark:text-amber-200">
              💸 Đang ở TK Tiên, cần chuyển cho Cô Vân
            </span>
            <span className="font-extrabold text-amber-900 dark:text-amber-200">
              {formatVnd(summary.roomChuyenKhoanTaiKhoanTien)}
            </span>
          </div>
        )}

        <PrintButton />
      </main>
    </>
  );
}

function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className={`flex justify-between py-1 ${bold ? "font-bold border-t border-black/10 dark:border-white/10 mt-1 pt-2" : ""}`}>
      <span>{label}</span>
      <span>{formatVnd(value)}</span>
    </div>
  );
}
