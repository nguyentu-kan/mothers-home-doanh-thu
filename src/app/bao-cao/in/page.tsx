import Header from "@/components/Header";
import PrintButton from "@/components/PrintButton";
import { getPeriodRange, getPreviousPeriodRange, computeChangePercent, type PeriodKey } from "@/lib/period";
import { getCashbookSummary, getStaffSummary, getPendingReceivablesSummary } from "@/lib/summary";
import { getCashLimitBreaches } from "@/lib/cash";
import { getSession } from "@/lib/session";
import { formatVnd, formatDateVn, formatDateTimeVn } from "@/lib/format";

const SHIFT_LABEL: Record<string, string> = { SANG: "Sáng", CHIEU: "Chiều", DEM: "Đêm" };

export default async function BaoCaoInPage({
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

  const [session, summary, prevSummary, breaches, staff, pendingReceivables] = await Promise.all([
    getSession(),
    getCashbookSummary(from, to),
    getCashbookSummary(prevRange.from, prevRange.to),
    getCashLimitBreaches(from, to),
    getStaffSummary(from, to),
    getPendingReceivablesSummary(),
  ]);

  const thuChangePct = computeChangePercent(summary.totalThu, prevSummary.totalThu);
  const chiChangePct = computeChangePercent(summary.totalChi, prevSummary.totalChi);

  return (
    <>
      <Header />
      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full flex flex-col gap-4">
        <div className="no-print">
          <PrintButton />
        </div>

        <div className="card print:shadow-none print:border-0">
          <div className="flex flex-col items-center text-center mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/logo.jpg" alt="Mother's Home" className="w-24 h-24 rounded-full mb-2" />
            <div className="font-extrabold text-xl text-[#1B3A5C]">KHÁCH SẠN MOTHER&apos;S HOME</div>
            <div className="text-sm text-slate-500">72 Nguyễn Khoái, P. Vĩnh Hội, Q.4, TP.HCM</div>
            <div className="font-bold text-lg mt-3">BÁO CÁO THU CHI</div>
            <div className="text-sm text-slate-500">
              Kỳ báo cáo: {formatDateVn(from)} – {formatDateVn(to)}
            </div>
          </div>

          <div className="font-bold text-[#1B3A5C] mb-1 border-t border-black/10 pt-3">Thu</div>
          <Row label="Phòng (tiền mặt)" value={summary.roomTienMat} />
          <Row label="Phòng (chuyển khoản)" value={summary.roomChuyenKhoan} />
          <Row label="OTA (công nợ)" value={summary.ota} />
          <Row label="Cà phê & Nước uống" value={summary.cafe} />
          <Row label="Gội đầu & Massage" value={summary.spa} />
          <Row label="TỔNG THU" value={summary.totalThu} bold change={thuChangePct} />

          <div className="font-bold text-[#1B3A5C] mt-4 mb-1">Chi</div>
          <Row label="Mặt bằng" value={summary.chiMatBang} />
          <Row label="Lương" value={summary.chiLuong} />
          <Row label="Mua hàng" value={summary.chiMuaHang} />
          <Row label="Khác" value={summary.chiKhac} />
          <Row label="TỔNG CHI" value={summary.totalChi} bold change={chiChangePct} />

          <div className="border-t border-black/10 mt-4 pt-3 flex justify-between items-center">
            <span className="font-extrabold">Chênh lệch (Thu − Chi)</span>
            <span className={`font-extrabold text-lg ${summary.chenhLech < 0 ? "text-red-600" : "text-emerald-600"}`}>
              {formatVnd(summary.chenhLech)}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            So với kỳ trước ({formatDateVn(prevRange.from)} – {formatDateVn(prevRange.to)})
          </p>

          <div className="mt-5 border-t border-black/10 pt-3">
            <div className="font-bold text-[#1B3A5C] mb-1">Vượt hạn mức tiền mặt</div>
            {breaches.length === 0 ? (
              <p className="text-sm">Không có lần nào vượt hạn mức trong kỳ này.</p>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {breaches.map((b, i) => (
                    <tr key={i}>
                      <td className="py-0.5">
                        {formatDateVn(b.date)} — Ca {SHIFT_LABEL[b.shiftType]}
                      </td>
                      <td className="py-0.5 text-right font-semibold">
                        {formatVnd(b.cashEndCounted)} {b.level === "DANGER" ? "(mức đỏ)" : "(mức vàng)"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="mt-5 border-t border-black/10 pt-3">
            <div className="font-bold text-[#1B3A5C] mb-1">Còn phải thu (hiện tại)</div>
            {pendingReceivables.count === 0 ? (
              <p className="text-sm">Không có khoản nào đang chờ thu.</p>
            ) : (
              <>
                <p className="text-sm mb-1">
                  {pendingReceivables.count} khoản, tổng <b>{formatVnd(pendingReceivables.total)}</b>
                </p>
                <table className="w-full text-sm">
                  <tbody>
                    {pendingReceivables.items.map((i) => (
                      <tr key={i.id}>
                        <td className="py-0.5">
                          {formatDateVn(i.time)} — {i.note || "(không ghi chú)"}
                        </td>
                        <td className="py-0.5 text-right font-semibold">{formatVnd(i.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>

          <div className="mt-5 border-t border-black/10 pt-3">
            <div className="font-bold text-[#1B3A5C] mb-1">Theo nhân viên</div>
            {staff.length === 0 ? (
              <p className="text-sm">Chưa có dữ liệu trong kỳ này.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-black/10">
                    <th className="py-1">Nhân viên</th>
                    <th className="py-1 text-right">Số dòng</th>
                    <th className="py-1 text-right">Tổng thu</th>
                    <th className="py-1 text-right">Tổng chi</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((s) => (
                    <tr key={s.userId}>
                      <td className="py-0.5">{s.name}</td>
                      <td className="py-0.5 text-right">{s.recordCount}</td>
                      <td className="py-0.5 text-right">{formatVnd(s.totalThu)}</td>
                      <td className="py-0.5 text-right">{formatVnd(s.totalChi)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <p className="text-xs text-slate-400 text-center mt-6 border-t border-black/10 pt-3">
            Xuất bởi {session.name} — {formatDateTimeVn(new Date())}
          </p>
        </div>
      </main>
    </>
  );
}

function Row({ label, value, bold, change }: { label: string; value: number; bold?: boolean; change?: number | null }) {
  return (
    <div className={`flex justify-between py-1 ${bold ? "font-bold border-t border-black/10 mt-1 pt-2" : ""}`}>
      <span>{label}</span>
      <span>
        {formatVnd(value)}
        {change !== undefined && change !== null && (
          <span className={`ml-2 text-xs ${change >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            ({change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(0)}%)
          </span>
        )}
      </span>
    </div>
  );
}
