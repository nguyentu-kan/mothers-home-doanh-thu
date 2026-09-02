import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sổ Thu Chi Mother's Home",
  description: "Ghi nhận dịch vụ & sổ thu chi khách sạn Mother's Home",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/logo.jpg",
    apple: "/icons/logo.jpg",
  },
};

// Toàn bộ app là dữ liệu riêng theo phiên đăng nhập (thu chi, ca trực...) — không có nội dung
// tĩnh dùng chung, nên luôn render động theo từng request thay vì build sẵn lúc build.
export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1B3A5C",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        {children}
      </body>
    </html>
  );
}
