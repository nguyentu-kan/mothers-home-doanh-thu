import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Cho phép test qua địa chỉ mạng LAN (vd. mở từ điện thoại cùng wifi) trong lúc chạy `next dev`.
  // Chỉ áp dụng cho môi trường dev — không ảnh hưởng khi deploy thật lên Vercel.
  allowedDevOrigins: ["192.168.1.13"],
  // Mặc định Next.js chỉ cho gửi tối đa 1MB mỗi lần gọi Server Action — quá nhỏ so với
  // ảnh chụp thẳng từ điện thoại (thường vài MB/ảnh) và các form cho đính kèm nhiều ảnh.
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
