"use client";

import { useActionState } from "react";
import { createUserAction, type UserFormState } from "./actions";

export default function CreateUserForm() {
  const [state, action, pending] = useActionState<UserFormState, FormData>(createUserAction, undefined);

  return (
    <form action={action} className="flex flex-col gap-3">
      <div>
        <label className="field-label">Tên</label>
        <input name="name" required className="field-input" placeholder="Vd: Nguyễn Ngọc Tiên" />
      </div>
      <div>
        <label className="field-label">Tên đăng nhập</label>
        <input name="username" required className="field-input" placeholder="Vd: tien" />
      </div>
      <div>
        <label className="field-label">Mật khẩu</label>
        <input name="password" type="password" required className="field-input" placeholder="Tối thiểu 4 ký tự" />
      </div>
      <div>
        <label className="field-label">Vai trò</label>
        <select name="role" defaultValue="NHAN_VIEN" className="field-input">
          <option value="NHAN_VIEN">Nhân viên</option>
          <option value="QUAN_LY">Quản lý</option>
          <option value="CHU_SO_HUU">Chủ sở hữu</option>
        </select>
      </div>
      <label className="flex items-center gap-2">
        <input type="checkbox" name="canManageCashbook" className="w-5 h-5" />
        Được quản lý Sổ Thu Chi
      </label>

      {state?.error && <p className="rounded-xl bg-red-100 px-4 py-3 text-red-800 font-semibold">{state.error}</p>}

      <button type="submit" disabled={pending} className="rounded-xl py-3 font-semibold bg-emerald-600 text-white">
        {pending ? "Đang thêm..." : "Thêm nhân viên"}
      </button>
    </form>
  );
}
