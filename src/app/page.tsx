import Header from "@/components/Header";
import CashBanner from "@/components/CashBanner";
import BigLinkButton from "@/components/BigLinkButton";

// Ai đăng nhập cũng thấy đủ 5 mục ở trang chủ (để thấy app đầy đủ cỡ nào) — quyền vào được hay
// không thật sự nằm ở proxy.ts (bấm vào mục không có quyền sẽ tự động đưa về đúng trang được phép).
export default async function HomePage() {
  return (
    <>
      <Header />
      <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full flex flex-col gap-4">
        <CashBanner />

        <div className="grid grid-cols-1 gap-4">
          <BigLinkButton href="/ghi-nhan" icon="☕" label="Ghi nhận dịch vụ" />
          <BigLinkButton href="/ban-giao-ca" icon="🔄" label="Bàn giao ca" color="#2563EB" />
          <BigLinkButton href="/so-thu-chi" icon="📒" label="Sổ Thu Chi" color="#0E7C66" />
          <BigLinkButton href="/bao-cao" icon="📊" label="Báo cáo" color="#7C3AED" />
          <BigLinkButton href="/quan-tri" icon="⚙️" label="Quản trị" color="#475569" />
        </div>
      </main>
    </>
  );
}
