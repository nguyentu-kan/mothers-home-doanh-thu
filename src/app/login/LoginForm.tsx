"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

type Props = {
  users: { id: string; name: string; username: string }[];
};

export default function LoginForm({ users }: Props) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, undefined);

  return (
    <form action={action} className="card flex flex-col gap-4">
      <div>
        <label className="field-label" htmlFor="username">
          Chọn tên
        </label>
        <select id="username" name="username" required className="field-input" defaultValue="">
          <option value="" disabled>
            -- Chọn tên của bạn --
          </option>
          {users.map((u) => (
            <option key={u.id} value={u.username}>
              {u.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="field-label" htmlFor="password">
          Mật khẩu
        </label>
        <input
          id="password"
          name="password"
          type="password"
          inputMode="numeric"
          required
          className="field-input"
          placeholder="Nhập mật khẩu"
        />
      </div>

      {state?.error && (
        <p className="rounded-xl bg-red-100 px-4 py-3 text-red-800 font-semibold">{state.error}</p>
      )}

      <button type="submit" disabled={pending} className="btn-big bg-[#1B3A5C]">
        {pending ? "Đang đăng nhập..." : "Đăng nhập"}
      </button>
    </form>
  );
}
