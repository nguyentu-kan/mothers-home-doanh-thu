import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { getCashBaseline, sumCashSince } from "@/lib/cash";
import { formatVnd, formatDateTimeVn } from "@/lib/format";
import Header from "@/components/Header";
import CashBanner from "@/components/CashBanner";
import HandoverCreateForm from "./HandoverCreateForm";
import { confirmReceiveAction } from "./actions";

const SHIFT_LABEL: Record<string, string> = { SANG: "Sáng", CHIEU: "Chiều", DEM: "Đêm" };

export default async function BanGiaoCaPage() {
  const session = await requireSession();

  const openHandover = await prisma.shiftHandover.findFirst({
    where: { OR: [{ handoverConfirmed: false }, { receiverConfirmed: false }] },
    include: { handoverUser: true, receiverUser: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <Header />
      <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full flex flex-col gap-4">
        <h1 className="text-xl font-extrabold text-[#1B3A5C] dark:text-white">Bàn giao ca</h1>
        <CashBanner />

        {openHandover ? (
          <div className="card flex flex-col gap-3">
            <div className="font-bold text-[#1B3A5C] dark:text-white">
              Ca {SHIFT_LABEL[openHandover.shiftType]} — {formatDateTimeVn(openHandover.date)}
            </div>
            <div>Người giao ca: {openHandover.handoverUser.name}</div>
            <div>Người nhận ca: {openHandover.receiverUser.name}</div>
            <div className="border-t border-black/10 dark:border-white/10 pt-2">
              Tiền mặt cuối ca (tính toán): <b>{formatVnd(openHandover.cashEndCalculated)}</b>
            </div>
            <div>
              Đếm thực tế: <b>{formatVnd(openHandover.cashEndCounted ?? 0)}</b>
            </div>
            {openHandover.cashEndCounted !== openHandover.cashEndCalculated && (
              <p className="rounded-xl bg-red-100 px-4 py-3 text-red-800 font-bold">
                🛑 Số đếm thực tế không khớp số tính toán — đã ghi nhận, cần Quản lý kiểm tra lại.
              </p>
            )}
            {openHandover.pendingNotes && (
              <div>
                Việc dở dang: <i>{openHandover.pendingNotes}</i>
              </div>
            )}

            {session.userId === openHandover.receiverUserId ? (
              <form action={confirmReceiveAction}>
                <input type="hidden" name="handoverId" value={openHandover.id} />
                <button type="submit" className="btn-big bg-emerald-600">
                  Xác nhận nhận ca
                </button>
              </form>
            ) : (
              <p className="text-slate-500">Đang chờ {openHandover.receiverUser.name} xác nhận nhận ca...</p>
            )}
          </div>
        ) : (
          <HandoverForm currentUserId={session.userId} />
        )}
      </main>
    </>
  );
}

async function HandoverForm({ currentUserId }: { currentUserId: string }) {
  const [otherUsers, { baselineAmount, periodStart }] = await Promise.all([
    prisma.user.findMany({
      where: { active: true, id: { not: currentUserId } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    getCashBaseline(),
  ]);
  const { cafeRevenue, spaRevenue, roomRevenue, otherExpense, ownerCashOut } = await sumCashSince(periodStart);
  const cashEndCalculated = baselineAmount + cafeRevenue + spaRevenue + roomRevenue - otherExpense - ownerCashOut;

  return (
    <HandoverCreateForm
      otherUsers={otherUsers}
      cashStart={baselineAmount}
      roomRevenue={roomRevenue}
      cafeRevenue={cafeRevenue}
      spaRevenue={spaRevenue}
      otherExpense={otherExpense}
      ownerCashOut={ownerCashOut}
      cashEndCalculated={cashEndCalculated}
    />
  );
}
