import { listActiveUsersForLogin } from "@/lib/auth";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const users = await listActiveUsersForLogin();

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/logo.jpg" alt="Mother's Home" className="w-32 h-32 mx-auto rounded-full mb-2" />
          <p className="text-slate-500 dark:text-slate-400">Sổ Thu Chi &amp; Dịch vụ</p>
        </div>
        <LoginForm users={users} />
      </div>
    </main>
  );
}
