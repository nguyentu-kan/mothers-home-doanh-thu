"use client";

import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { parseQuickCaptureAction, confirmQuickCaptureAction, type ParseState } from "./actions";
import type { DraftEntry, DraftEntryType } from "@/lib/gemini";

// Web Speech API chưa có sẵn trong TypeScript lib chuẩn — khai báo tối thiểu phần dùng tới.
type SpeechRecognitionResultLike = { transcript: string };
type SpeechRecognitionEventLike = { results: SpeechRecognitionResultLike[][] };
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;
declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

const TYPE_LABELS: Record<DraftEntryType, string> = {
  ROOM_TIEN_MAT: "Thu phòng — Tiền mặt",
  ROOM_CHUYEN_KHOAN: "Thu phòng — Chuyển khoản",
  OTA: "OTA công nợ",
  CHI_MAT_BANG: "Chi — Mặt bằng",
  CHI_LUONG: "Chi — Lương",
  CHI_MUA_HANG: "Chi — Mua hàng",
  CHI_KHAC: "Chi — Khác",
};

const TYPE_OPTIONS = Object.entries(TYPE_LABELS) as [DraftEntryType, string][];

// Ảnh chụp thẳng từ điện thoại thường 2-5MB — AI không cần độ phân giải gốc để đọc chữ viết tay,
// nên nén nhỏ lại trước khi gửi giúp AI xử lý nhanh hơn và đỡ bị quá tải/timeout hơn.
async function compressImage(file: File, maxDim = 1600, quality = 0.8): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;
    if (width > maxDim || height > maxDim) {
      const scale = maxDim / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export default function QuickCaptureForm() {
  const router = useRouter();
  const [parseState, parseAction, parsePending] = useActionState<ParseState, FormData>(
    parseQuickCaptureAction,
    undefined
  );

  const [text, setText] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [compressing, setCompressing] = useState(false);
  const [listening, setListening] = useState(false);
  const [draft, setDraft] = useState<DraftEntry[] | null>(null);
  const [confirmPending, setConfirmPending] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const currentDraft = draft ?? (parseState?.ok ? parseState.entries : null);

  function toggleListening() {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) {
      alert("Trình duyệt này chưa hỗ trợ nhận diện giọng nói. Bạn có thể gõ chữ trực tiếp.");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const recognition = new Ctor();
    recognition.lang = "vi-VN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  function updateDraftEntry(index: number, patch: Partial<DraftEntry>) {
    setDraft((prev) => {
      const base = prev ?? (parseState?.ok ? parseState.entries : []);
      return base.map((e, i) => (i === index ? { ...e, ...patch } : e));
    });
  }

  function removeDraftEntry(index: number) {
    setDraft((prev) => {
      const base = prev ?? (parseState?.ok ? parseState.entries : []);
      return base.filter((_, i) => i !== index);
    });
  }

  function addDraftEntry() {
    setDraft((prev) => {
      const base = prev ?? (parseState?.ok ? parseState.entries : []);
      return [...base, { type: "CHI_KHAC", amount: 0, note: "", date: null }];
    });
  }

  async function handleConfirm() {
    if (!currentDraft || currentDraft.length === 0) return;
    setConfirmPending(true);
    setConfirmError(null);
    try {
      const result = await confirmQuickCaptureAction(currentDraft);
      if (!result.ok) {
        setConfirmError(result.error);
        return;
      }
      router.push("/so-thu-chi");
    } catch {
      setConfirmError(
        "Không thể lưu — có thể do mất mạng. Các dòng đã đọc vẫn còn ở đây, kiểm tra mạng rồi bấm Xác nhận lưu lại."
      );
    } finally {
      setConfirmPending(false);
    }
  }

  if (currentDraft) {
    const todayStr = new Date().toISOString().slice(0, 10);
    return (
      <div className="flex flex-col gap-4">
        <p className="text-slate-500">AI đọc được {currentDraft.length} khoản. Kiểm tra và sửa nếu cần trước khi lưu.</p>
        <p className="text-sm text-amber-700 dark:text-amber-400 -mt-2">
          ⚠️ Nếu ảnh là sổ tay của ngày cũ (ghi bù), nhớ kiểm tra lại ô Ngày của từng khoản — mặc định là hôm nay
          nếu AI không đọc được ngày.
        </p>

        {currentDraft.map((entry, i) => (
          <div key={i} className="card flex flex-col gap-3">
            <select
              value={entry.type}
              onChange={(e) => updateDraftEntry(i, { type: e.target.value as DraftEntryType })}
              className="field-input"
            >
              {TYPE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <div>
              <label className="field-label text-sm">Ngày</label>
              <input
                type="date"
                value={entry.date || todayStr}
                onChange={(e) => updateDraftEntry(i, { date: e.target.value })}
                className="field-input"
              />
            </div>
            <input
              type="text"
              inputMode="numeric"
              value={entry.amount ? entry.amount.toLocaleString("vi-VN") : ""}
              onChange={(e) => updateDraftEntry(i, { amount: parseInt(e.target.value.replace(/\D/g, "") || "0", 10) })}
              className="field-input font-bold"
              placeholder="Số tiền"
            />
            <input
              type="text"
              value={entry.note}
              onChange={(e) => updateDraftEntry(i, { note: e.target.value })}
              className="field-input"
              placeholder="Ghi chú"
            />
            <button
              type="button"
              onClick={() => removeDraftEntry(i)}
              className="self-start text-red-600 font-semibold text-sm"
            >
              🗑️ Xoá dòng này
            </button>
          </div>
        ))}

        <button type="button" onClick={addDraftEntry} className="rounded-xl py-3 font-semibold bg-slate-200 dark:bg-white/10">
          + Thêm dòng
        </button>

        {confirmError && <p className="rounded-xl bg-red-100 px-4 py-3 text-red-800 font-semibold">{confirmError}</p>}

        <button
          type="button"
          onClick={handleConfirm}
          disabled={confirmPending || currentDraft.length === 0}
          className="btn-big bg-emerald-600"
        >
          {confirmPending ? "Đang lưu..." : "✅ Xác nhận lưu tất cả"}
        </button>
        <button
          type="button"
          onClick={() => setDraft(null)}
          className="rounded-xl py-3 font-semibold bg-slate-200 dark:bg-white/10"
        >
          Huỷ, đọc lại từ đầu
        </button>
      </div>
    );
  }

  return (
    <form action={parseAction} className="flex flex-col gap-5">
      <div>
        <label className="field-label" htmlFor="images">
          Ảnh sổ tay / hoá đơn / chuyển khoản (có thể chọn nhiều ảnh)
        </label>
        <input
          ref={fileInputRef}
          id="images"
          name="images"
          type="file"
          accept="image/*"
          multiple
          onChange={async (e) => {
            const files = Array.from(e.target.files || []);
            if (files.length === 0) {
              setImages([]);
              return;
            }
            setCompressing(true);
            const compressed = await Promise.all(files.map((f) => compressImage(f)));
            const dt = new DataTransfer();
            compressed.forEach((f) => dt.items.add(f));
            if (fileInputRef.current) fileInputRef.current.files = dt.files;
            setImages(compressed);
            setCompressing(false);
          }}
          className="field-input"
        />
        {compressing && <p className="text-sm text-slate-500 mt-1">Đang nén ảnh...</p>}
        {!compressing && images.length > 0 && (
          <p className="text-sm text-slate-500 mt-1">Đã chọn {images.length} ảnh</p>
        )}
      </div>

      <div>
        <label className="field-label" htmlFor="text">
          Hoặc nói / gõ nội dung
        </label>
        <div className="flex gap-2 mb-2">
          <button
            type="button"
            onClick={toggleListening}
            className={`rounded-xl px-4 py-3 font-semibold ${listening ? "bg-red-600 text-white" : "bg-slate-200 dark:bg-white/10"}`}
          >
            {listening ? "⏹️ Dừng nói" : "🎤 Nói"}
          </button>
        </div>
        <textarea
          id="text"
          name="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          className="field-input"
          placeholder="Vd: 9/8 thu 500 nghìn tiền mặt phòng 301, chi 200 nghìn mua hàng"
        />
      </div>

      {parseState && !parseState.ok && (
        <p className="rounded-xl bg-red-100 px-4 py-3 text-red-800 font-semibold">{parseState.error}</p>
      )}

      <button type="submit" disabled={parsePending || compressing} className="btn-big bg-[#1B3A5C]">
        {parsePending ? "Đang đọc..." : "🤖 Đọc giúp tôi"}
      </button>
    </form>
  );
}
