import Header from "@/components/Header";
import BigLinkButton from "@/components/BigLinkButton";

export default function QuanTriPage() {
  return (
    <>
      <Header />
      <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full flex flex-col gap-4">
        <h1 className="text-xl font-extrabold text-[#1B3A5C] dark:text-white">Quản trị</h1>
        <BigLinkButton href="/quan-tri/nhan-vien" icon="👤" label="Tài khoản nhân viên" />
        <BigLinkButton href="/quan-tri/mon-dich-vu" icon="🍽️" label="Món & Dịch vụ" color="#B45309" />
        <BigLinkButton href="/quan-tri/cai-dat" icon="⚙️" label="Cài đặt" color="#475569" />
      </main>
    </>
  );
}
