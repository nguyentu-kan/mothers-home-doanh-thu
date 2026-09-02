import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function upsertUser(data: {
  name: string;
  username: string;
  password: string;
  role: "NHAN_VIEN" | "QUAN_LY" | "CHU_SO_HUU";
  canManageCashbook?: boolean;
}) {
  const passwordHash = await bcrypt.hash(data.password, 10);
  await prisma.user.upsert({
    where: { username: data.username },
    update: {},
    create: {
      name: data.name,
      username: data.username,
      passwordHash,
      role: data.role,
      canManageCashbook: data.canManageCashbook ?? false,
    },
  });
}

async function main() {
  console.log("Đang tạo tài khoản mẫu...");

  await upsertUser({ name: "Cô Vân", username: "van", password: "1234", role: "CHU_SO_HUU" });
  await upsertUser({ name: "Thầy Thành", username: "thanh", password: "1234", role: "QUAN_LY" });
  await upsertUser({
    name: "Ngọc Tiên",
    username: "tien",
    password: "1234",
    role: "NHAN_VIEN",
    canManageCashbook: true,
  });
  await upsertUser({ name: "Chú Toàn", username: "toan", password: "1234", role: "NHAN_VIEN" });
  await upsertUser({ name: "KTV A", username: "ktv", password: "1234", role: "NHAN_VIEN" });

  console.log("Đang tạo danh mục món ăn/dịch vụ...");

  const menuItems: { category: "CA_PHE" | "SPA"; name: string; price: number; sortOrder: number }[] = [
    { category: "CA_PHE", name: "Cà phê đen đá", price: 20000, sortOrder: 1 },
    { category: "CA_PHE", name: "Cà phê sữa đá", price: 25000, sortOrder: 2 },
    { category: "CA_PHE", name: "Trà đá", price: 10000, sortOrder: 3 },
    { category: "CA_PHE", name: "Nước suối", price: 15000, sortOrder: 4 },
    { category: "CA_PHE", name: "Nước ngọt", price: 20000, sortOrder: 5 },
    { category: "SPA", name: "Gội đầu", price: 80000, sortOrder: 1 },
    { category: "SPA", name: "Massage 60 phút", price: 250000, sortOrder: 2 },
    { category: "SPA", name: "Massage 90 phút", price: 350000, sortOrder: 3 },
  ];

  for (const item of menuItems) {
    const existing = await prisma.menuItem.findFirst({ where: { name: item.name, category: item.category } });
    if (!existing) {
      await prisma.menuItem.create({ data: item });
    }
  }

  console.log("Đang tạo cài đặt mặc định...");

  await prisma.appSetting.upsert({
    where: { key: "cash_warning_threshold" },
    update: {},
    create: { key: "cash_warning_threshold", value: "3000000" },
  });
  await prisma.appSetting.upsert({
    where: { key: "cash_danger_threshold" },
    update: {},
    create: { key: "cash_danger_threshold", value: "5000000" },
  });
  await prisma.appSetting.upsert({
    where: { key: "initial_cash" },
    update: {},
    create: { key: "initial_cash", value: "0" },
  });

  console.log("Xong! Tài khoản mẫu: van/1234, thanh/1234, tien/1234, toan/1234, ktv/1234");
  console.log("⚠️  Hãy đổi mật khẩu thật trong trang Quản trị > Tài khoản nhân viên trước khi dùng thật.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
