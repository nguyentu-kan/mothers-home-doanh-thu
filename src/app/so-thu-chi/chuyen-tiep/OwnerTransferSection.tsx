"use client";

import { useActionState, useState, useTransition } from "react";
import { addOwnerTransferAction, deleteOwnerTransferAction, type OwnerTransferFormState } from "./actions";
import { formatVnd, formatDateTimeVn } from "@/lib/format";

type Transfer = {
  id: string;
  time: Date;
  amount: number;
  note: string | null;
  attachmentUrls: string[];
  recordedByName: string;
};

export default function OwnerTransferSection({
  outstanding,
  transfers,
}: {
  outstanding: number;
  transfers: Transfer[];
}) {
  const [addState, addAction, addPending] = useActionState<OwnerTransferFormState, FormData>(
    addOwnerTransferAction,
    undefined
  );
  const [showAddForm, setShowAddForm] = useState(false);
  const [attachmentCount, setAttachmentCount] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleDelete(id: string) {
    if (!confirm("Xoá lần chuyển tiếp này?")) return;
    setDeleteError(null);
    setDeletingId(id);
    startTransition(async () => {
      const result = await deleteOwnerTransferAction(id);
      setDeletingId(null);
      if (!result.ok) setDeleteError(result.error);
    });
  }

  if (outstanding <= 0 && transfers.length === 0) return null;

  return (
    <div className="no-print card">
      <div className="flex items-center justify-between mb-2">
        <div className="font-bold text-[#1B3A5C] dark:text-white">🔁 Chuyển tiếp cho Cô Vân</div>
        <button
          type="button"
          onClick={() => setShowAddForm((v) => !v)}
          className="text-sm font-semibold text-[#1B3A5C] dark:text-blue-300"
        >
          {showAddForm ? "Đóng" : "+ Ghi đã chuyển"}
        </button>
      </div>

      {outstanding > 0 ? (
        <div className="rounded-xl bg-amber-100 dark:bg-amber-900/40 px-4 py-3 flex justify-between items-center mb-2">
          <span className="font-semibold text-amber-900 dark:text-amber-200">Còn cần chuyển</span>
          <span className="font-extrabold text-amber-900 dark:text-amber-200">{formatVnd(outstanding)}</span>
        </div>
      ) : (
        <p className="text-sm text-emerald-700 mb-2">Đã chuyển đủ, không còn thiếu.</p>
      )}

      {showAddForm && (
        <form
          action={addAction}
          className="flex flex-col gap-2 mb-3 pb-3 border-b border-black/10 dark:border-white/10"
        >
          <input name="amount" type="number" min={1} required placeholder="Số tiền đã chuyển" className="field-input" />
          <input name="note" placeholder="Ghi chú (không bắt buộc)" className="field-input" />
          <div>
            <label className="field-label text-sm">Ảnh chuyển khoản (chọn được nhiều ảnh)</label>
            <input
              name="attachments"
              type="file"
              accept="image/*,.pdf"
              multiple
              onChange={(e) => setAttachmentCount(e.target.files?.length ?? 0)}
              className="field-input"
            />
            {attachmentCount > 0 && <p className="text-sm text-slate-500 mt-1">Đã chọn {attachmentCount} ảnh</p>}
          </div>
          {addState?.error && <p className="text-sm text-red-700 font-semibold">{addState.error}</p>}
          <button type="submit" disabled={addPending} className="rounded-xl py-2.5 font-semibold bg-[#1B3A5C] text-white">
            {addPending ? "Đang lưu..." : "Lưu"}
          </button>
        </form>
      )}

      {transfers.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="text-sm font-semibold text-[#1B3A5C] dark:text-blue-300"
          >
            {showHistory ? "Ẩn lịch sử" : `Xem lịch sử (${transfers.length})`}
          </button>
          {showHistory && (
            <div className="flex flex-col divide-y divide-black/5 dark:divide-white/5 mt-2">
              {deleteError && <p className="text-sm text-red-700 font-semibold mb-2">{deleteError}</p>}
              {transfers.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{t.note || "(không ghi chú)"}</div>
                    <div className="text-xs text-slate-500">
                      {formatDateTimeVn(t.time)} — {t.recordedByName}
                      {t.attachmentUrls.length > 0 && (
                        <>
                          {" — "}
                          {t.attachmentUrls.map((url, i) => (
                            <a
                              key={url}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 underline font-semibold"
                            >
                              📎 Ảnh {t.attachmentUrls.length > 1 ? i + 1 : ""}{" "}
                            </a>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-bold">{formatVnd(t.amount)}</span>
                    <button
                      type="button"
                      onClick={() => handleDelete(t.id)}
                      disabled={deletingId === t.id}
                      className="text-red-600 font-semibold text-sm disabled:opacity-50"
                    >
                      {deletingId === t.id ? "..." : "🗑️"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
