"use client";

import { useActionState, useState } from "react";
import { addOtaReceivableAction, type CashbookFormState } from "../actions";

const PLATFORMS: { value: "AGODA" | "CTRIP" | "BOOKING" | "KHAC"; label: string }[] = [
  { value: "AGODA", label: "Agoda" },
  { value: "CTRIP", label: "Ctrip" },
  { value: "BOOKING", label: "Booking.com" },
  { value: "KHAC", label: "Khác" },
];

export default function OtaForm() {
  const [state, action, pending] = useActionState<CashbookFormState, FormData>(addOtaReceivableAction, undefined);
  const [platform, setPlatform] = useState<"AGODA" | "CTRIP" | "BOOKING" | "KHAC" | "">("");

  return (
    <form action={action} className="flex flex-col gap-5">
      <div>
        <label className="field-label">Sàn OTA</label>
        <div className="grid grid-cols-2 gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPlatform(p.value)}
              className={`rounded-xl py-3 font-semibold ${platform === p.value ? "bg-[#1B3A5C] text-white" : "bg-slate-200 dark:bg-white/10"}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <input type="hidden" name="platform" value={platform} />
      </div>

      <div>
        <label className="field-label" htmlFor="amount">
          Số tiền công nợ phát sinh
        </label>
        <input id="amount" name="amount" type="number" min={1} required className="field-input text-xl font-bold" />
      </div>

      <div>
        <label className="field-label" htmlFor="note">
          Ghi chú
        </label>
        <input id="note" name="note" className="field-input" placeholder="Vd: 3 đêm phòng 301, khách John" />
      </div>

      <div>
        <label className="field-label" htmlFor="attachment">
          Ảnh/PDF xác nhận đặt phòng (nếu có)
        </label>
        <input id="attachment" name="attachment" type="file" accept="image/*,.pdf" className="field-input" />
      </div>

      {state?.error && <p className="rounded-xl bg-red-100 px-4 py-3 text-red-800 font-semibold">{state.error}</p>}

      <button type="submit" disabled={pending || !platform} className="btn-big bg-emerald-600">
        {pending ? "Đang lưu..." : "Lưu"}
      </button>
    </form>
  );
}
