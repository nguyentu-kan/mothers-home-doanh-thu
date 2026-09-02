"use client";

import { useActionState, useState } from "react";
import { addExpenseAction, type CashbookFormState } from "../actions";

const CATEGORIES: { value: "MAT_BANG" | "LUONG" | "MUA_HANG" | "KHAC"; label: string }[] = [
  { value: "MAT_BANG", label: "Mặt bằng" },
  { value: "LUONG", label: "Lương" },
  { value: "MUA_HANG", label: "Mua hàng" },
  { value: "KHAC", label: "Khác" },
];

export default function ExpenseForm() {
  const [state, action, pending] = useActionState<CashbookFormState, FormData>(addExpenseAction, undefined);
  const [category, setCategory] = useState<"MAT_BANG" | "LUONG" | "MUA_HANG" | "KHAC" | "">("");
  const [method, setMethod] = useState<"TIEN_MAT" | "CHUYEN_KHOAN" | "">("");

  return (
    <form action={action} className="flex flex-col gap-5">
      <div>
        <label className="field-label">Hạng mục</label>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              className={`rounded-xl py-3 font-semibold ${category === c.value ? "bg-[#1B3A5C] text-white" : "bg-slate-200 dark:bg-white/10"}`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <input type="hidden" name="category" value={category} />
      </div>

      <div>
        <label className="field-label" htmlFor="amount">
          Số tiền
        </label>
        <input id="amount" name="amount" type="number" min={1} required className="field-input text-xl font-bold" />
      </div>

      <div>
        <label className="field-label">Hình thức</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMethod("TIEN_MAT")}
            className={`rounded-xl py-3 font-semibold ${method === "TIEN_MAT" ? "bg-[#1B3A5C] text-white" : "bg-slate-200 dark:bg-white/10"}`}
          >
            Tiền mặt
          </button>
          <button
            type="button"
            onClick={() => setMethod("CHUYEN_KHOAN")}
            className={`rounded-xl py-3 font-semibold ${method === "CHUYEN_KHOAN" ? "bg-[#1B3A5C] text-white" : "bg-slate-200 dark:bg-white/10"}`}
          >
            Chuyển khoản
          </button>
        </div>
        <input type="hidden" name="method" value={method} />
      </div>

      <div>
        <label className="field-label" htmlFor="note">
          Lý do chi
        </label>
        <input id="note" name="note" required className="field-input" placeholder="Vd: Tiền thuê mặt bằng tháng 9" />
      </div>

      <div>
        <label className="field-label" htmlFor="attachment">
          Ảnh hoá đơn (nếu có)
        </label>
        <input
          id="attachment"
          name="attachment"
          type="file"
          accept="image/*,.pdf"
          capture="environment"
          className="field-input"
        />
      </div>

      {state?.error && <p className="rounded-xl bg-red-100 px-4 py-3 text-red-800 font-semibold">{state.error}</p>}

      <button type="submit" disabled={pending || !category || !method} className="btn-big bg-emerald-600">
        {pending ? "Đang lưu..." : "Lưu"}
      </button>
    </form>
  );
}
