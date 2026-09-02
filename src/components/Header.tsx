import Link from "next/link";
import { getSession } from "@/lib/session";
import { logoutAction } from "@/app/actions";

export default async function Header() {
  const session = await getSession();
  if (!session.userId) return null;

  return (
    <header className="no-print sticky top-0 z-10 bg-[#1B3A5C] text-white px-4 py-3 flex items-center justify-between shadow">
      <Link href="/" className="flex items-center gap-2 font-bold text-lg active:opacity-70">
        <span className="text-xl leading-none">🏠</span>
        <span className="w-8 h-8 rounded-full bg-white overflow-hidden shrink-0 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/logo.jpg" alt="Mother's Home" className="w-full h-full object-cover" />
        </span>
        <span className="hidden sm:inline">Mother&apos;s Home</span>
      </Link>
      <div className="flex items-center gap-3 text-sm">
        <span className="opacity-90">{session.name}</span>
        <form action={logoutAction}>
          <button type="submit" className="rounded-lg bg-white/15 px-3 py-1.5 font-semibold">
            Đăng xuất
          </button>
        </form>
      </div>
    </header>
  );
}
