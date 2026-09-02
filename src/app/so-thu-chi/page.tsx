import Link from "next/link";
import Header from "@/components/Header";
import CashBanner from "@/components/CashBanner";
import BigLinkButton from "@/components/BigLinkButton";
import PrintButton from "@/components/PrintButton";
import PeriodTabs from "@/components/PeriodTabs";
import { getPeriodRange, type PeriodKey } from "@/lib/period";
import { getCashbookSummary } from "@/lib/summary";
import { formatVnd, formatDateVn } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";
import PendingReceivablesList from "./con-thu/PendingReceivablesList";

// Sau giờ này mà chưa ghi khoản Thu phòng nào trong ngày thì nhắc — hầu hết ngày khách sạn đều
// có khách nhận/trả phòng trước giờ này, nên im lặng tới lúc đó nhiều khả năng là quên ghi.
const REMINDER_HOUR = 20;

export default async function SoThuChiPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const period = (typeof params.period === "string" ? params.period : "today") as PeriodKey;
  const { from, to } = getPeriodRange(period);
  const now = new Date();
  const todayFilter = { gte: startOfDay(now), lte: endOfDay(now) };

  const [summary, roomToday, otaToday, expenseToday, serviceToday, pendingReceivables] = await Promise.all([
    getCashbookSummary(from, to),
    prisma.roomRevenueEntry.count({ where: { time: todayFilter } }),
    prisma.otaReceivable.count({ where: { date: todayFilter } }),
    prisma.expense.count({ where: { time: todayFilter } }),
    prisma.serviceRecord.count({ where: { time: todayFilter } }),
    prisma.pendingReceivable.findMany({
      where: { status: "PENDING" },
      orderBy: { time: "asc" },
      include: { recordedByUser: { select: { name: true } } },
    }),
  ]);

  const showReminder = now.getHours() >= REMINDER_HOUR && roomToday === 0;

  return (
    <>
      <Header />
      <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full flex flex-col gap-4">
        <h1 className="text-xl font-extrabold text-[#1B3A5C] dark:text-white no-print">Sổ Thu Chi</h1>

        {showReminder && (
          <div className="no-print rounded-2xl bg-red-100 dark:bg-red-900/40 px-4 py-3">
            <p className="font-bold text-red-800 dark:text-red-200">⏰ Hôm nay chưa ghi khoản Thu phòng nào</p>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              Nếu hôm nay có khách, nhớ ghi lại trước khi hết ngày — dễ nhất là chụp ảnh sổ tay và để AI đọc giúp bên
              dưới.
            </p>
          </div>
        )}

        <div className="no-print">
          <CashBanner />
        </div>

        <Link
          href="/so-thu-chi/nhap-nhanh"
          className="no-print flex items-center gap-3 rounded-2xl py-5 px-5 text-white shadow active:scale-[0.98] transition"
          style={{ backgroundColor: "#7C3AED" }}
        >
          <span className="text-4xl">🤖</span>
          <span>
            <span className="block font-bold text-xl">Nhập nhanh bằng AI</span>
            <span className="block text-sm opacity-90">Cách nhanh nhất — chụp ảnh sổ tay, AI tự đọc và tách khoản</span>
          </span>
        </Link>

        <p className="no-print text-sm text-slate-500 text-center -mt-2">— hoặc tự nhập từng khoản —</p>

        <div className="no-print grid grid-cols-3 gap-3">
          <BigLinkButton href="/so-thu-chi/thu-phong" icon="💰" label="Thu phòng" color="#0E7C66" />
          <BigLinkButton href="/so-thu-chi/ota" icon="🌐" label="OTA công nợ" color="#0369A1" />
          <BigLinkButton href="/so-thu-chi/chi-phi" icon="🧾" label="Chi phí" color="#B91C1C" />
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

        <PendingReceivablesList
          items={pendingReceivables.map((p) => ({
            id: p.id,
            time: p.time,
            amount: p.amount,
            note: p.note,
            recordedByName: p.recordedByUser.name,
          }))}
        />

        <div className="no-print card">
          <div className="font-bold text-[#1B3A5C] dark:text-white mb-2">✅ Kiểm tra cuối ngày (hôm nay)</div>
          <ChecklistRow label="Thu phòng" count={roomToday} />
          <ChecklistRow label="OTA công nợ" count={otaToday} />
          <ChecklistRow label="Chi phí" count={expenseToday} />
          <ChecklistRow label="Cà phê/Spa (nhân viên khác ghi)" count={serviceToday} />
        </div>

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

function ChecklistRow({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex justify-between items-center py-1.5">
      <span className="text-sm">{label}</span>
      {count > 0 ? (
        <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">✅ {count} khoản</span>
      ) : (
        <span className="text-sm text-slate-400">— chưa có</span>
      )}
    </div>
  );
}
