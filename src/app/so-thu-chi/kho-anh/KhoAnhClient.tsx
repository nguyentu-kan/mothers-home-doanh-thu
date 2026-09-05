"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  uploadUnassignedAttachmentsAction,
  deleteUnassignedAttachmentAction,
  acknowledgeDuplicateWarningAction,
  linkAttachmentToTransferAction,
  createTransferFromAttachmentAction,
  type UploadState,
  type CreateFromAttachmentState,
} from "./actions";
import { formatVnd, formatDateVn } from "@/lib/format";
import { format } from "date-fns";

type Attachment = {
  id: string;
  url: string;
  note: string | null;
  time: Date;
  suggestedAmount: number | null;
  transactionCode: string | null;
  duplicateWarning: string | null;
  recordedByName: string;
};

type Transfer = {
  id: string;
  time: Date;
  amount: number;
  method: "TIEN_MAT" | "CHUYEN_KHOAN";
  note: string | null;
  attachmentCount: number;
};

export default function KhoAnhClient({ attachments, transfers }: { attachments: Attachment[]; transfers: Transfer[] }) {
  const [uploadState, uploadAction, uploadPending] = useActionState<UploadState, FormData>(
    uploadUnassignedAttachmentsAction,
    undefined
  );
  const router = useRouter();

  useEffect(() => {
    if (uploadState && "ok" in uploadState && uploadState.ok) {
      router.refresh();
    }
  }, [uploadState, router]);

  return (
    <div className="flex flex-col gap-4">
      <form action={uploadAction} className="card flex flex-col gap-2">
        <div className="font-bold text-[#1B3A5C] dark:text-white">Up ảnh mới</div>
        <div>
          <label className="field-label text-sm">Ngày (bỏ trống để AI tự đọc trên ảnh)</label>
          <input type="date" name="date" className="field-input" />
        </div>
        <div>
          <label className="field-label text-sm">Ghi chú (không bắt buộc)</label>
          <input name="note" placeholder="Vd: ảnh của tuần trước" className="field-input" />
        </div>
        <div>
          <label className="field-label text-sm">Ảnh (chọn được nhiều ảnh)</label>
          <input name="photos" type="file" accept="image/*,.pdf" multiple required className="field-input" />
        </div>
        {uploadState && "error" in uploadState && (
          <p className="text-sm text-red-700 font-semibold">{uploadState.error}</p>
        )}
        <button type="submit" disabled={uploadPending} className="rounded-xl py-2.5 font-semibold bg-[#1B3A5C] text-white">
          {uploadPending ? "Đang tải lên..." : "Tải lên"}
        </button>
      </form>

      <div className="font-bold text-[#1B3A5C] dark:text-white">Ảnh chưa gắn khoản nào ({attachments.length})</div>

      {attachments.length === 0 ? (
        <p className="text-sm text-slate-500">Kho ảnh đang trống.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {attachments.map((a) => (
            <AttachmentCard key={a.id} attachment={a} transfers={transfers} />
          ))}
        </div>
      )}
    </div>
  );
}

function AttachmentCard({ attachment, transfers }: { attachment: Attachment; transfers: Transfer[] }) {
  const [mode, setMode] = useState<"NONE" | "LINK" | "CREATE">("NONE");
  const [deleting, startDeleteTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [acking, startAckTransition] = useTransition();
  const [ackError, setAckError] = useState<string | null>(null);
  const router = useRouter();

  function handleDelete() {
    if (!confirm("Xoá ảnh này khỏi kho?")) return;
    setDeleteError(null);
    startDeleteTransition(async () => {
      const result = await deleteUnassignedAttachmentAction(attachment.id);
      if (!result.ok) {
        setDeleteError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleAcknowledge() {
    setAckError(null);
    startAckTransition(async () => {
      const result = await acknowledgeDuplicateWarningAction(attachment.id);
      if (!result.ok) {
        setAckError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="card flex flex-col gap-2">
      {attachment.duplicateWarning && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 p-2 flex flex-col gap-1.5">
          <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">⚠️ {attachment.duplicateWarning}</p>
          {ackError && <p className="text-xs text-red-700 font-semibold">{ackError}</p>}
          <button
            type="button"
            onClick={handleAcknowledge}
            disabled={acking}
            className="self-start rounded-lg px-2.5 py-1 text-xs font-semibold bg-amber-600 text-white disabled:opacity-50"
          >
            {acking ? "..." : "Đã kiểm tra, vẫn giữ ảnh này"}
          </button>
        </div>
      )}
      <div className="flex gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={attachment.url} alt="Ảnh chứng từ" className="w-20 h-20 object-cover rounded-lg flex-none" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold truncate">{attachment.note || "(không ghi chú)"}</div>
          <div className="text-xs text-slate-500">
            {formatDateVn(attachment.time)} — {attachment.recordedByName}
          </div>
          {attachment.suggestedAmount != null && (
            <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              🤖 AI đọc được: {formatVnd(attachment.suggestedAmount)}
            </div>
          )}
          {attachment.transactionCode != null && (
            <div className="text-xs text-slate-500">Mã GD: {attachment.transactionCode}</div>
          )}
          <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline font-semibold">
            Xem ảnh gốc
          </a>
        </div>
      </div>

      {deleteError && <p className="text-sm text-red-700 font-semibold">{deleteError}</p>}

      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setMode(mode === "LINK" ? "NONE" : "LINK")}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${mode === "LINK" ? "bg-[#1B3A5C] text-white" : "bg-slate-200 dark:bg-white/10"}`}
        >
          Gắn vào khoản có sẵn
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === "CREATE" ? "NONE" : "CREATE")}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${mode === "CREATE" ? "bg-[#1B3A5C] text-white" : "bg-slate-200 dark:bg-white/10"}`}
        >
          Tạo khoản mới
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="rounded-lg px-3 py-1.5 text-sm font-semibold text-red-600"
        >
          {deleting ? "..." : "🗑️ Xoá ảnh"}
        </button>
      </div>

      {mode === "LINK" && (
        <LinkForm
          attachmentId={attachment.id}
          suggestedAmount={attachment.suggestedAmount}
          transfers={transfers}
          onDone={() => setMode("NONE")}
        />
      )}
      {mode === "CREATE" && <CreateForm attachment={attachment} onDone={() => setMode("NONE")} />}
    </div>
  );
}

function LinkForm({
  attachmentId,
  suggestedAmount,
  transfers,
  onDone,
}: {
  attachmentId: string;
  suggestedAmount: number | null;
  transfers: Transfer[];
  onDone: () => void;
}) {
  // Nếu AI đọc được số tiền và đúng 1 khoản có sẵn khớp số tiền đó (chưa có ảnh) — chọn sẵn luôn,
  // đỡ phải dò trong danh sách; vẫn đổi lại được bình thường nếu chọn sai.
  const suggestedMatch =
    suggestedAmount != null
      ? transfers.find((t) => t.amount === suggestedAmount && t.attachmentCount === 0)
      : undefined;
  const [transferId, setTransferId] = useState(suggestedMatch?.id ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleConfirm() {
    if (!transferId) return;
    setError(null);
    startTransition(async () => {
      const result = await linkAttachmentToTransferAction(attachmentId, transferId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
      onDone();
    });
  }

  if (transfers.length === 0) {
    return (
      <p className="text-sm text-slate-500 border-t border-black/10 dark:border-white/10 pt-2">
        Chưa có khoản &quot;Chuyển tiếp cho Cô Vân&quot; nào để gắn — tạo khoản mới thay vì gắn.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2 border-t border-black/10 dark:border-white/10 pt-2">
      {suggestedMatch && (
        <p className="text-xs text-emerald-700 dark:text-emerald-400">
          🤖 Đã tự chọn khoản khớp số tiền AI đọc được — kiểm tra lại trước khi xác nhận.
        </p>
      )}
      <select value={transferId} onChange={(e) => setTransferId(e.target.value)} className="field-input">
        <option value="">-- Chọn khoản đã ghi --</option>
        {transfers.map((t) => (
          <option key={t.id} value={t.id}>
            {formatDateVn(t.time)} — {formatVnd(t.amount)} — {t.note || "(không ghi chú)"}
            {t.attachmentCount > 0 ? ` — đã có ${t.attachmentCount} ảnh` : ""}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-red-700 font-semibold">{error}</p>}
      <button
        type="button"
        onClick={handleConfirm}
        disabled={!transferId || pending}
        className="rounded-lg py-2 text-sm font-bold bg-emerald-600 text-white disabled:opacity-50"
      >
        {pending ? "Đang gắn..." : "Xác nhận gắn ảnh vào khoản này"}
      </button>
    </div>
  );
}

function CreateForm({ attachment, onDone }: { attachment: Attachment; onDone: () => void }) {
  const boundAction = createTransferFromAttachmentAction.bind(null, attachment.id);
  const [state, action, pending] = useActionState<CreateFromAttachmentState, FormData>(boundAction, undefined);
  const [method, setMethod] = useState<"CHUYEN_KHOAN" | "TIEN_MAT">("CHUYEN_KHOAN");
  const router = useRouter();

  useEffect(() => {
    if (state && "ok" in state && state.ok) {
      router.refresh();
      onDone();
    }
  }, [state, router, onDone]);

  return (
    <form action={action} className="flex flex-col gap-2 border-t border-black/10 dark:border-white/10 pt-2">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setMethod("CHUYEN_KHOAN")}
          className={`rounded-lg py-2 text-sm font-semibold ${method === "CHUYEN_KHOAN" ? "bg-[#1B3A5C] text-white" : "bg-white dark:bg-white/10"}`}
        >
          🏦 Chuyển khoản
        </button>
        <button
          type="button"
          onClick={() => setMethod("TIEN_MAT")}
          className={`rounded-lg py-2 text-sm font-semibold ${method === "TIEN_MAT" ? "bg-[#1B3A5C] text-white" : "bg-white dark:bg-white/10"}`}
        >
          💵 Tiền mặt
        </button>
      </div>
      <input type="hidden" name="method" value={method} />
      <div className="grid grid-cols-2 gap-2">
        <input type="date" name="date" defaultValue={format(attachment.time, "yyyy-MM-dd")} className="field-input" />
        <input
          type="number"
          name="amount"
          min={1}
          required
          defaultValue={attachment.suggestedAmount ?? undefined}
          placeholder="Số tiền"
          className="field-input"
        />
      </div>
      <input name="note" defaultValue={attachment.note ?? ""} placeholder="Ghi chú" className="field-input" />
      {state && "error" in state && <p className="text-sm text-red-700 font-semibold">{state.error}</p>}
      <button type="submit" disabled={pending} className="rounded-lg py-2 text-sm font-bold bg-emerald-600 text-white">
        {pending ? "Đang tạo..." : "Tạo khoản Chuyển tiếp cho Cô Vân"}
      </button>
    </form>
  );
}
