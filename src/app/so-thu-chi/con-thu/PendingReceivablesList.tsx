"use client";

import { useActionState, useState, useTransition } from "react";
import { addPendingReceivableAction, collectPendingReceivableAction, type PendingReceivableFormState } from "./actions";
import { formatVnd, formatDateTimeVn } from "@/lib/format";

type Item = {
  id: string;
  time: Date;
  amount: number;
  note: string | null;
  recordedByName: string;
};

export default function PendingReceivablesList({ items }: { items: Item[] }) {
  const [addState, addAction, addPending] = useActionState<PendingReceivableFormState, FormData>(
    addPendingReceivableAction,
    undefined
  );
  const [showAddForm, setShowAddForm] = useState(false);
  const [collectingId, setCollectingId] = useState<string | null>(null);

  return (
    <div className="no-print card">
      <div className="flex items-center justify-between mb-2">
        <div className="font-bold text-[#1B3A5C] dark:text-white">📋 Còn phải thu ({items.length})</div>
        <button
          type="button"
          onClick={() => setShowAddForm((v) => !v)}
          className="text-sm font-semibold text-[#1B3A5C] dark:text-blue-300"
        >
          {showAddForm ? "Đóng" : "+ Thêm"}
        </button>
      </div>

      {showAddForm && (
        <form
          action={addAction}
          className="flex flex-col gap-2 mb-3 pb-3 border-b border-black/10 dark:border-white/10"
        >
          <input
            name="amount"
            type="number"
            min={1}
            required
            placeholder="Số tiền còn thu"
            className="field-input"
          />
          <input name="note" placeholder="Ghi chú (vd: Phòng 401, khách John)" className="field-input" />
          {addState?.error && <p className="text-sm text-red-700 font-semibold">{addState.error}</p>}
          <button type="submit" disabled={addPending} className="rounded-xl py-2.5 font-semibold bg-[#1B3A5C] text-white">
            {addPending ? "Đang lưu..." : "Lưu khoản còn thu"}
          </button>
        </form>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-slate-500">Không có khoản nào đang chờ thu.</p>
      ) : (
        <div className="flex flex-col divide-y divide-black/5 dark:divide-white/5">
          {items.map((item) => (
            <PendingRow
              key={item.id}
              item={item}
              expanded={collectingId === item.id}
              onToggle={() => setCollectingId(collectingId === item.id ? null : item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PendingRow({ item, expanded, onToggle }: { item: Item; expanded: boolean; onToggle: () => void }) {
  const [method, setMethod] = useState<"TIEN_MAT" | "CHUYEN_KHOAN" | "">("");
  const [transferAccount, setTransferAccount] = useState<"TIEN" | "VAN" | "">("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    if (!method) return;
    setError(null);
    startTransition(async () => {
      const result = await collectPendingReceivableAction(
        item.id,
        method,
        method === "CHUYEN_KHOAN" ? (transferAccount || null) : null
      );
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{item.note || "(không ghi chú)"}</div>
          <div className="text-xs text-slate-500">
            {formatDateTimeVn(item.time)} — {item.recordedByName}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="font-bold">{formatVnd(item.amount)}</span>
          <button
            type="button"
            onClick={onToggle}
            className="rounded-lg px-3 py-1.5 text-sm font-semibold bg-emerald-600 text-white"
          >
            ✅ Đã thu
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-2 rounded-xl bg-slate-100 dark:bg-white/5 p-3 flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMethod("TIEN_MAT")}
              className={`rounded-lg py-2 text-sm font-semibold ${method === "TIEN_MAT" ? "bg-[#1B3A5C] text-white" : "bg-white dark:bg-white/10"}`}
            >
              Tiền mặt
            </button>
            <button
              type="button"
              onClick={() => setMethod("CHUYEN_KHOAN")}
              className={`rounded-lg py-2 text-sm font-semibold ${method === "CHUYEN_KHOAN" ? "bg-[#1B3A5C] text-white" : "bg-white dark:bg-white/10"}`}
            >
              Chuyển khoản
            </button>
          </div>
          {method === "CHUYEN_KHOAN" && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTransferAccount("TIEN")}
                className={`rounded-lg py-2 text-sm font-semibold ${transferAccount === "TIEN" ? "bg-[#1B3A5C] text-white" : "bg-white dark:bg-white/10"}`}
              >
                TK Ngọc Tiên
              </button>
              <button
                type="button"
                onClick={() => setTransferAccount("VAN")}
                className={`rounded-lg py-2 text-sm font-semibold ${transferAccount === "VAN" ? "bg-[#1B3A5C] text-white" : "bg-white dark:bg-white/10"}`}
              >
                TK Cô Vân
              </button>
            </div>
          )}
          {error && <p className="text-sm text-red-700 font-semibold">{error}</p>}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={pending || !method || (method === "CHUYEN_KHOAN" && !transferAccount)}
            className="rounded-lg py-2 text-sm font-bold bg-emerald-600 text-white disabled:opacity-50"
          >
            {pending ? "Đang lưu..." : "Xác nhận đã thu"}
          </button>
        </div>
      )}
    </div>
  );
}
