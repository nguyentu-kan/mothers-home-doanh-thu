import Link from "next/link";
import { getOwnerTransferBalance } from "@/lib/summary";
import { formatVnd } from "@/lib/format";

// Nhắc ngay ở trang chủ nếu còn tiền khách chuyển khoản vào TK Tiên chưa chuyển trả Cô Vân —
// giống CashBanner, chỉ hiện khi có việc cần làm, bấm vào là vào thẳng Sổ Thu Chi để ghi.
export default async function OwnerTransferBanner() {
  const { outstanding } = await getOwnerTransferBalance();
  if (outstanding <= 0) return null;

  return (
    <Link
      href="/so-thu-chi"
      className="no-print rounded-2xl px-4 py-3 font-bold text-center bg-amber-400 text-amber-950 block active:scale-[0.98] transition"
    >
      🔁 Còn cần chuyển khoản cho Cô Vân: {formatVnd(outstanding)}
      <div className="font-normal text-sm mt-1">Bấm vào để ghi đã chuyển</div>
    </Link>
  );
}
