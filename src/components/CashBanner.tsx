import { computeCashOnHand, getCashThresholds, classifyCashLevel } from "@/lib/cash";
import { formatVnd } from "@/lib/format";

export default async function CashBanner() {
  const [{ amount }, { warning, danger }] = await Promise.all([computeCashOnHand(), getCashThresholds()]);
  const level = classifyCashLevel(amount, warning, danger);

  if (level === "OK") return null;

  const isDanger = level === "DANGER";

  return (
    <div
      className={`no-print rounded-2xl px-4 py-3 font-bold text-center ${
        isDanger ? "bg-red-600 text-white" : "bg-amber-400 text-amber-950"
      }`}
    >
      {isDanger ? "🔴" : "🟡"} Tiền mặt tại quầy: {formatVnd(amount)}
      <div className="font-normal text-sm mt-1">
        {isDanger ? "Bắt buộc nộp ngân hàng trong ngày" : "Cân nhắc nộp bớt ngân hàng"}
      </div>
    </div>
  );
}
