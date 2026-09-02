import { prisma } from "@/lib/prisma";
import Header from "@/components/Header";
import { updateUserAction, resetPasswordAction } from "./actions";
import CreateUserForm from "./CreateUserForm";

const ROLE_LABEL: Record<string, string> = {
  NHAN_VIEN: "Nhân viên",
  QUAN_LY: "Quản lý",
  CHU_SO_HUU: "Chủ sở hữu",
};

export default async function NhanVienPage() {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <>
      <Header />
      <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full flex flex-col gap-4">
        <h1 className="text-xl font-extrabold text-[#1B3A5C] dark:text-white">Quản lý tài khoản</h1>

        <div className="card">
          <div className="font-bold mb-3">Thêm nhân viên mới</div>
          <CreateUserForm />
        </div>

        <div className="flex flex-col gap-3">
          {users.map((u) => (
            <div key={u.id} className="card flex flex-col gap-3">
              <form action={updateUserAction} className="flex flex-col gap-3">
                <input type="hidden" name="id" value={u.id} />
                <div>
                  <label className="field-label">Tên</label>
                  <input name="name" defaultValue={u.name} className="field-input" />
                </div>
                <div className="text-sm text-slate-500">Tên đăng nhập: {u.username}</div>
                <div>
                  <label className="field-label">Vai trò</label>
                  <select name="role" defaultValue={u.role} className="field-input">
                    {Object.entries(ROLE_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="canManageCashbook" defaultChecked={u.canManageCashbook} className="w-5 h-5" />
                  Được quản lý Sổ Thu Chi
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="active" defaultChecked={u.active} className="w-5 h-5" />
                  Đang hoạt động (bỏ tick để khoá tài khoản)
                </label>
                <button type="submit" className="rounded-xl py-3 font-semibold bg-[#1B3A5C] text-white">
                  Lưu thay đổi
                </button>
              </form>

              <form action={resetPasswordAction} className="flex gap-2 items-end border-t border-black/10 dark:border-white/10 pt-3">
                <input type="hidden" name="id" value={u.id} />
                <div className="flex-1">
                  <label className="field-label">Đặt mật khẩu mới</label>
                  <input name="newPassword" type="password" className="field-input" placeholder="Mật khẩu mới" />
                </div>
                <button type="submit" className="rounded-xl px-4 py-3 font-semibold bg-slate-600 text-white">
                  Đổi
                </button>
              </form>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
