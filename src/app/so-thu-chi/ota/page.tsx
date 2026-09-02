import Link from "next/link";
import Header from "@/components/Header";
import OtaForm from "./OtaForm";

export default function OtaPage() {
  return (
    <>
      <Header />
      <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Link href="/so-thu-chi" className="text-[#1B3A5C] dark:text-white font-semibold">
            ← Sổ Thu Chi
          </Link>
        </div>
        <h1 className="text-xl font-extrabold text-[#1B3A5C] dark:text-white">🌐 OTA công nợ</h1>
        <OtaForm />
      </main>
    </>
  );
}
