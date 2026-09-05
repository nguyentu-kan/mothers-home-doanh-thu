import Link from "next/link";
import Header from "@/components/Header";
import CashBanner from "@/components/CashBanner";
import BigLinkButton from "@/components/BigLinkButton";
import PrintButton from "@/components/PrintButton";
import PeriodTabs from "@/components/PeriodTabs";
import { getPeriodRange, type PeriodKey } from "@/lib/period";
import { getCashbookSummary, getOwnerTransferBalance } from "@/lib/summary";
import { formatVnd, formatDateVn } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";
import PendingReceivablesList from "./con-thu/PendingReceivablesList";
import TodayCashbookEntriesList from "./TodayCashbookEntriesList";
import OwnerTransferSection from "./chuyen-tiep/OwnerTransferSection";

const OTA_PLATFORM_LABEL: Record<string, string> = { AGODA: "Agoda", CTRIP: "Ctrip", BOOKING: "Booking.com", KHAC: "Khác" };
const EXPENSE_CATEGORY_LABEL: Record<string, string> = {
  MAT_BANG: "Mặt bằng",
  LUONG: "Lương",
  MUA_HANG: "Mua hàng",
  KHAC: "Khác",
};

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

  const [
    summary,
    roomEntriesToday,
    otaEntriesToday,
    expenseEntriesToday,
    serviceToday,
    pendingReceivables,
    ownerTransferBalance,
    pendingAttachmentCount,
  ] = await Promise.all([
    getCashbookSummary(from, to),
    prisma.roomRevenueEntry.findMany({ where: { time: todayFilter }, orderBy: { time: "desc" } }),
    prisma.otaReceivable.findMany({ where: { date: todayFilter }, orderBy: { date: "desc" } }),
    prisma.expense.findMany({ where: { time: todayFilter }, orderBy: { time: "desc" } }),
    prisma.serviceRecord.count({ where: { time: todayFilter } }),
    prisma.pendingReceivable.findMany({
      where: { status: "PENDING" },
      orderBy: { time: "asc" },
      include: { recordedByUser: { select: { name: true } } },
    }),
    getOwnerTransferBalance(),
    prisma.unassignedAttachment.count(),
  ]);

  const roomToday = roomEntriesToday.length;
  const otaToday = otaEntriesToday.length;
  const expenseToday = expenseEntriesToday.length;

  const todayCashbookEntries = [
    ...roomEntriesToday.map((r) => ({
      id: r.id,
      kind: "ROOM" as const,
      time: r.time,
      amount: r.amount,
      description: `Thu phòng — ${r.note || (r.method === "TIEN_MAT" ? "Tiền mặt" : "Chuyển khoản")}`,
    })),
    ...otaEntriesToday.map((o) => ({
      id: o.id,
      kind: "OTA" as const,
      time: o.date,
      amount: o.amount,
      description: `OTA — ${OTA_PLATFORM_LABEL[o.platform]}${o.note ? " — " + o.note : ""}`,
    })),
    ...expenseEntriesToday.map((e) => ({
      id: e.id,
      kind: "EXPENSE" as const,
      time: e.time,
      amount: e.amount,
      description: `Chi — ${EXPENSE_CATEGORY_LABEL[e.category]} — ${e.note}`,
    })),
  ].sort((a, b) => b.time.getTime() - a.time.getTime());

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

        <OwnerTransferSection
          outstanding={ownerTransferBalance.outstanding}
          cashHandedOut={ownerTransferBalance.cashHandedOut}
          transfers={ownerTransferBalance.transfers}
          pendingAttachmentCount={pendingAttachmentCount}
        />

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

        <TodayCashbookEntriesList entries={todayCashbookEntries} />

        <div className="no-print flex flex-col gap-1.5">
          <a href="/so-thu-chi/backup" className="rounded-xl py-3 text-center font-semibold bg-slate-600 text-white">
            💾 Sao lưu toàn bộ dữ liệu
          </a>
          <p className="text-xs text-slate-400 text-center">
            Tải về máy rồi đưa lên Google Drive lưu — nên làm định kỳ (vd mỗi tuần), phòng khi có sự cố.
          </p>
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
