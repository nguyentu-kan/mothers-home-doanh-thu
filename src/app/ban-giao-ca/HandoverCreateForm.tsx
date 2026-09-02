"use client";

import { useActionState, useState } from "react";
import { createHandoverAction, type HandoverFormState } from "./actions";
import { formatVnd } from "@/lib/format";

type Props = {
  otherUsers: { id: string; name: string }[];
  cashStart: number;
  roomRevenue: number;
  cafeRevenue: number;
  spaRevenue: number;
  otherExpense: number;
  ownerCashOut: number;
  cashEndCalculated: number;
};

const SHIFTS = [
  { value: "SANG", label: "Sáng" },
  { value: "CHIEU", label: "Chiều" },
  { value: "DEM", label: "Đêm" },
];

export default function HandoverCreateForm(props: Props) {
  const [state, action, pending] = useActionState<HandoverFormState, FormData>(createHandoverAction, undefined);
  const [shiftType, setShiftType] = useState("");
  const [receiverUserId, setReceiverUserId] = useState("");
  const [cashEndCounted, setCashEndCounted] = useState<string>("");

  const countedNumber = cashEndCounted === "" ? null : parseInt(cashEndCounted, 10);
  const mismatch = countedNumber !== null && countedNumber !== props.cashEndCalculated;

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="card">
        <div className="font-bold text-[#1B3A5C] dark:text-white mb-2">Tự động tính (từ ca trước đến giờ)</div>
        <SummaryRow label="Tiền mặt đầu ca" value={props.cashStart} />
        <SummaryRow label="+ Thu tiền phòng (tiền mặt)" value={props.roomRevenue} />
        <SummaryRow label="+ Thu Cà phê/Nước" value={props.cafeRevenue} />
        <SummaryRow label="+ Thu Spa" value={props.spaRevenue} />
        <SummaryRow label="− Chi phí (tiền mặt)" value={-props.otherExpense} />
        {props.ownerCashOut > 0 && <SummaryRow label="− Đã đưa tiền mặt cho Cô Vân" value={-props.ownerCashOut} />}
        <SummaryRow label="= Tiền mặt cuối ca" value={props.cashEndCalculated} bold />
      </div>

      <div>
        <label className="field-label">Ca</label>
        <div className="grid grid-cols-3 gap-2">
          {SHIFTS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setShiftType(s.value)}
              className={`rounded-xl py-3 font-semibold ${shiftType === s.value ? "bg-[#1B3A5C] text-white" : "bg-slate-200 dark:bg-white/10"}`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <input type="hidden" name="shiftType" value={shiftType} />
      </div>

      <div>
        <label className="field-label" htmlFor="receiverUserId">
          Người nhận ca
        </label>
        <select
          id="receiverUserId"
          name="receiverUserId"
          required
          value={receiverUserId}
          onChange={(e) => setReceiverUserId(e.target.value)}
          className="field-input"
        >
          <option value="" disabled>
            -- Chọn người nhận ca --
          </option>
          {props.otherUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="field-label" htmlFor="cashEndCounted">
          Đếm thực tế tiền mặt cuối ca
        </label>
        <input
          id="cashEndCounted"
          name="cashEndCounted"
          type="number"
          required
          value={cashEndCounted}
          onChange={(e) => setCashEndCounted(e.target.value)}
          className="field-input text-xl font-bold"
        />
        {mismatch && (
          <p className="mt-2 rounded-xl bg-red-100 px-4 py-3 text-red-800 font-bold">
            🛑 Lệch {formatVnd(Math.abs((countedNumber ?? 0) - props.cashEndCalculated))} so với số tính toán — đếm lại
            lần 2, nếu vẫn lệch thì ghi rõ vào ghi chú và báo Quản lý.
          </p>
        )}
      </div>

      <div>
        <label className="field-label" htmlFor="pendingNotes">
          Việc dở dang / lưu ý ca sau
        </label>
        <textarea id="pendingNotes" name="pendingNotes" rows={3} className="field-input" />
      </div>

      {state?.error && <p className="rounded-xl bg-red-100 px-4 py-3 text-red-800 font-semibold">{state.error}</p>}

      <button type="submit" disabled={pending || !shiftType || !receiverUserId} className="btn-big bg-emerald-600">
        {pending ? "Đang lưu..." : "Xác nhận giao ca"}
      </button>
    </form>
  );
}

function SummaryRow({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className={`flex justify-between py-1 ${bold ? "font-bold border-t border-black/10 dark:border-white/10 mt-1 pt-2" : ""}`}>
      <span>{label}</span>
      <span>{formatVnd(value)}</span>
    </div>
  );
}
