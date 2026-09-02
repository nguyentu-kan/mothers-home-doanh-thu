import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Cho phép test qua địa chỉ mạng LAN (vd. mở từ điện thoại cùng wifi) trong lúc chạy `next dev`.
  // Chỉ áp dụng cho môi trường dev — không ảnh hưởng khi deploy thật lên Vercel.
  allowedDevOrigins: ["192.168.1.13"],
};

export default nextConfig;
