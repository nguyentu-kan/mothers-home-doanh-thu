"use client";

export default function Error({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-4 px-6 py-10 text-center">
      <div className="text-4xl">📶</div>
      <h1 className="text-lg font-bold text-[#1B3A5C] dark:text-white">Có lỗi xảy ra, có thể do mất mạng</h1>
      <p className="text-slate-500 max-w-xs">
        Kiểm tra lại wifi/4G rồi bấm nút bên dưới để thử lại. Nếu vừa nhập dữ liệu, hãy kiểm tra lại trước khi nhập lần nữa.
      </p>
      <button onClick={() => retry()} className="btn-big bg-emerald-600 max-w-xs">
        Thử lại
      </button>
    </main>
  );
}
