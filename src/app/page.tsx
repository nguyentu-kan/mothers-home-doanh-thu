import { getSession } from "@/lib/session";
import { isManager, canManageCashbook, isAppAdmin } from "@/lib/permissions";
import Header from "@/components/Header";
import CashBanner from "@/components/CashBanner";
import BigLinkButton from "@/components/BigLinkButton";

export default async function HomePage() {
  const session = await getSession();
  const manager = isManager(session.role);
  const cashbook = canManageCashbook(session);
  const admin = isAppAdmin(session);

  return (
    <>
      <Header />
      <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full flex flex-col gap-4">
        <CashBanner />

        <div className="grid grid-cols-1 gap-4">
          <BigLinkButton href="/ghi-nhan" icon="☕" label="Ghi nhận dịch vụ" />
          <BigLinkButton href="/ban-giao-ca" icon="🔄" label="Bàn giao ca" color="#2563EB" />
          {cashbook && <BigLinkButton href="/so-thu-chi" icon="📒" label="Sổ Thu Chi" color="#0E7C66" />}
          {manager && <BigLinkButton href="/bao-cao" icon="📊" label="Báo cáo" color="#7C3AED" />}
          {admin && <BigLinkButton href="/quan-tri" icon="⚙️" label="Quản trị" color="#475569" />}
        </div>
      </main>
    </>
  );
}
