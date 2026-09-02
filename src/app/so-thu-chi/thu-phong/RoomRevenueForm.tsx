"use client";

import { useActionState, useState } from "react";
import { addRoomRevenueAction, type CashbookFormState } from "../actions";

export default function RoomRevenueForm() {
  const [state, action, pending] = useActionState<CashbookFormState, FormData>(addRoomRevenueAction, undefined);
  const [method, setMethod] = useState<"TIEN_MAT" | "CHUYEN_KHOAN" | "">("");
  const [attachmentCount, setAttachmentCount] = useState(0);

  return (
    <form action={action} className="flex flex-col gap-5">
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
          Ghi chú (số phòng/khách)
        </label>
        <input id="note" name="note" className="field-input" placeholder="Vd: Phòng 205, khách gọi hotline" />
      </div>

      <div>
        <label className="field-label" htmlFor="attachments">
          Ảnh chuyển khoản (nếu có, chọn được nhiều ảnh)
        </label>
        <input
          id="attachments"
          name="attachments"
          type="file"
          accept="image/*,.pdf"
          multiple
          onChange={(e) => setAttachmentCount(e.target.files?.length ?? 0)}
          className="field-input"
        />
        {attachmentCount > 0 && <p className="text-sm text-slate-500 mt-1">Đã chọn {attachmentCount} ảnh</p>}
      </div>

      {state?.error && <p className="rounded-xl bg-red-100 px-4 py-3 text-red-800 font-semibold">{state.error}</p>}

      <button type="submit" disabled={pending || !method} className="btn-big bg-emerald-600">
        {pending ? "Đang lưu..." : "Lưu"}
      </button>
    </form>
  );
}
