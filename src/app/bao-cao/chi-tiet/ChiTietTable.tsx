"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateActivityRowAction, type UpdateActivityRowState, type TargetType } from "./actions";
import type { ActivityRow } from "@/lib/activity";
import { formatVnd, formatDateTimeVn } from "@/lib/format";
import { format } from "date-fns";

const METHOD_OPTIONS = [
  { value: "TIEN_MAT", label: "Tiền mặt" },
  { value: "CHUYEN_KHOAN", label: "Chuyển khoản" },
];
const SERVICE_METHOD_OPTIONS = [...METHOD_OPTIONS, { value: "GHI_PHONG", label: "Ghi phòng" }];
const PLATFORM_OPTIONS = [
  { value: "AGODA", label: "Agoda" },
  { value: "CTRIP", label: "Ctrip" },
  { value: "BOOKING", label: "Booking.com" },
  { value: "KHAC", label: "Khác" },
];
const CATEGORY_OPTIONS = [
  { value: "MAT_BANG", label: "Mặt bằng" },
  { value: "LUONG", label: "Lương" },
  { value: "MUA_HANG", label: "Mua hàng" },
  { value: "KHAC", label: "Khác" },
];
const TRANSFER_ACCOUNT_OPTIONS = [
  { value: "", label: "-- Không rõ TK --" },
  { value: "TIEN", label: "TK Tiên" },
  { value: "VAN", label: "TK Cô Vân" },
];
const LOAI_KHOAN_OPTIONS: { value: TargetType; label: string }[] = [
  { value: "ROOM", label: "💰 Thu phòng" },
  { value: "OTA", label: "🌐 OTA công nợ" },
  { value: "EXPENSE", label: "🧾 Chi phí" },
  { value: "SERVICE_CA_PHE", label: "☕ Cà phê" },
  { value: "SERVICE_SPA", label: "💆 Spa" },
  { value: "PENDING", label: "📋 Còn phải thu" },
  { value: "OWNER_TRANSFER", label: "🔁 Chuyển tiếp cho Cô Vân" },
];

function initialTargetType(row: ActivityRow): TargetType {
  if (row.kind === "SERVICE") return row.editData.category === "SPA" ? "SERVICE_SPA" : "SERVICE_CA_PHE";
  return row.kind;
}

export default function ChiTietTable({ rows, canEdit }: { rows: ActivityRow[]; canEdit: boolean }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const colCount = canEdit ? 7 : 6;

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b border-black/10 dark:border-white/10">
            <th className="py-2 pr-2">Thời gian</th>
            <th className="py-2 pr-2">Loại</th>
            <th className="py-2 pr-2">Nội dung</th>
            <th className="py-2 pr-2 text-right">Số tiền</th>
            <th className="py-2 pr-2">Người ghi</th>
            <th className="py-2 pr-2">Chứng từ</th>
            {canEdit && <th className="py-2 pr-2"></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <RowGroup
              key={`${r.kind}-${r.id}`}
              row={r}
              canEdit={canEdit}
              editing={editingId === `${r.kind}-${r.id}`}
              onToggle={() => setEditingId((cur) => (cur === `${r.kind}-${r.id}` ? null : `${r.kind}-${r.id}`))}
              onSaved={() => setEditingId(null)}
            />
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={colCount} className="py-4 text-center text-slate-500">
                Không có dữ liệu trong khoảng thời gian này.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function RowGroup({
  row,
  canEdit,
  editing,
  onToggle,
  onSaved,
}: {
  row: ActivityRow;
  canEdit: boolean;
  editing: boolean;
  onToggle: () => void;
  onSaved: () => void;
}) {
  return (
    <>
      <tr className="border-b border-black/5 dark:border-white/5">
        <td className="py-2 pr-2 whitespace-nowrap">{formatDateTimeVn(row.time)}</td>
        <td className="py-2 pr-2 whitespace-nowrap">{row.type}</td>
        <td className="py-2 pr-2">{row.description}</td>
        <td className={`py-2 pr-2 text-right whitespace-nowrap ${row.amount < 0 ? "text-red-600" : ""}`}>
          {formatVnd(row.amount)}
        </td>
        <td className="py-2 pr-2 whitespace-nowrap">{row.recordedByName}</td>
        <td className="py-2 pr-2 whitespace-nowrap">
          {row.attachmentUrls.length > 0 ? (
            <span className="flex gap-2">
              {row.attachmentUrls.map((url, j) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline font-semibold"
                >
                  📎 Ảnh {row.attachmentUrls.length > 1 ? j + 1 : ""}
                </a>
              ))}
            </span>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </td>
        {canEdit && (
          <td className="py-2 pr-2 whitespace-nowrap">
            <button type="button" onClick={onToggle} className="text-sm font-semibold text-[#1B3A5C] dark:text-blue-300">
              {editing ? "Đóng" : "✏️ Sửa"}
            </button>
          </td>
        )}
      </tr>
      {editing && canEdit && (
        <tr className="border-b border-black/5 dark:border-white/5 bg-slate-50 dark:bg-white/5">
          <td colSpan={7} className="p-3">
            <EditForm row={row} onSaved={onSaved} />
          </td>
        </tr>
      )}
    </>
  );
}

function EditForm({ row, onSaved }: { row: ActivityRow; onSaved: () => void }) {
  const router = useRouter();
  const boundAction = updateActivityRowAction.bind(null, row.kind, row.id);
  const [state, action, pending] = useActionState<UpdateActivityRowState, FormData>(boundAction, undefined);
  const e = row.editData;
  const [targetType, setTargetType] = useState<TargetType>(initialTargetType(row));

  const isService = targetType === "SERVICE_CA_PHE" || targetType === "SERVICE_SPA";
  const changedType = isService ? row.kind !== "SERVICE" : targetType !== row.kind;
  const noteOrContent = e.note || e.content || "";
  // Chỉ 4 loại này có cột attachmentUrls trong DB — Dịch vụ/Còn phải thu không lưu ảnh được.
  const supportsAttachments =
    targetType === "ROOM" || targetType === "OTA" || targetType === "EXPENSE" || targetType === "OWNER_TRANSFER";

  useEffect(() => {
    if (state && "ok" in state && state.ok) {
      router.refresh();
      onSaved();
    }
  }, [state, router, onSaved]);

  return (
    <form
      action={async (formData) => {
        await action(formData);
      }}
      className="flex flex-col gap-2 max-w-md"
    >
      <div>
        <label className="field-label text-xs">Loại khoản</label>
        <select
          value={targetType}
          onChange={(ev) => setTargetType(ev.target.value as TargetType)}
          className="field-input"
        >
          {LOAI_KHOAN_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <input type="hidden" name="targetType" value={targetType} />
      </div>
      {changedType && (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          ⚠️ Ghi nhầm loại — đổi lại sẽ chuyển dòng này sang đúng danh sách (số tiền/ghi chú giữ nguyên, người ghi gốc
          không đổi).
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="field-label text-xs">Ngày</label>
          <input type="date" name="date" defaultValue={format(row.time, "yyyy-MM-dd")} className="field-input" />
        </div>
        <div>
          <label className="field-label text-xs">Số tiền</label>
          <input type="number" name="amount" min={1} required defaultValue={e.amount} className="field-input" />
        </div>
      </div>

      {isService && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="field-label text-xs">Phòng/Khách</label>
              <input name="roomOrGuest" defaultValue={e.roomOrGuest} className="field-input" />
            </div>
            <div>
              <label className="field-label text-xs">Nội dung</label>
              <input name="content" defaultValue={e.content ?? noteOrContent} className="field-input" />
            </div>
          </div>
          <SelectField
            label="Hình thức"
            name="method"
            defaultValue={row.kind === "SERVICE" ? e.method : "TIEN_MAT"}
            options={SERVICE_METHOD_OPTIONS}
          />
        </>
      )}

      {targetType === "ROOM" && (
        <>
          <SelectField
            label="Hình thức"
            name="method"
            defaultValue={row.kind === "ROOM" ? e.method : "TIEN_MAT"}
            options={METHOD_OPTIONS}
          />
          <SelectField
            label="Tài khoản nhận (nếu chuyển khoản)"
            name="transferAccount"
            defaultValue={row.kind === "ROOM" ? e.transferAccount ?? "" : ""}
            options={TRANSFER_ACCOUNT_OPTIONS}
          />
          <NoteField defaultValue={noteOrContent} />
        </>
      )}

      {targetType === "OTA" && (
        <>
          <SelectField
            label="Sàn OTA"
            name="platform"
            defaultValue={row.kind === "OTA" ? e.platform : "KHAC"}
            options={PLATFORM_OPTIONS}
          />
          <NoteField defaultValue={noteOrContent} />
        </>
      )}

      {targetType === "EXPENSE" && (
        <>
          <SelectField
            label="Hạng mục"
            name="category"
            defaultValue={row.kind === "EXPENSE" ? e.category : "KHAC"}
            options={CATEGORY_OPTIONS}
          />
          <SelectField
            label="Hình thức"
            name="method"
            defaultValue={row.kind === "EXPENSE" ? e.method : "TIEN_MAT"}
            options={METHOD_OPTIONS}
          />
          <NoteField label="Lý do chi" defaultValue={noteOrContent} />
        </>
      )}

      {targetType === "PENDING" && <NoteField defaultValue={noteOrContent} />}

      {targetType === "OWNER_TRANSFER" && (
        <>
          <SelectField
            label="Hình thức"
            name="method"
            defaultValue={row.kind === "OWNER_TRANSFER" ? e.method : "CHUYEN_KHOAN"}
            options={METHOD_OPTIONS}
          />
          <NoteField defaultValue={noteOrContent} />
        </>
      )}

      {supportsAttachments && (
        <div>
          <label className="field-label text-xs">
            {row.attachmentUrls.length > 0 ? "Thêm ảnh (nếu quên đính kèm lúc ghi)" : "Đính kèm ảnh (không bắt buộc)"}
          </label>
          <input name="attachments" type="file" accept="image/*,.pdf" multiple className="field-input" />
        </div>
      )}

      {state && "error" in state && <p className="text-sm text-red-700 font-semibold">{state.error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="rounded-xl px-4 py-2 font-semibold bg-[#1B3A5C] text-white">
          {pending ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
        <button type="button" onClick={onSaved} className="rounded-xl px-4 py-2 font-semibold bg-slate-200 dark:bg-white/10">
          Đóng
        </button>
      </div>
    </form>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="field-label text-xs">{label}</label>
      <select name={name} defaultValue={defaultValue} className="field-input">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function NoteField({ label = "Ghi chú", defaultValue }: { label?: string; defaultValue?: string }) {
  return (
    <div>
      <label className="field-label text-xs">{label}</label>
      <input name="note" defaultValue={defaultValue} className="field-input" />
    </div>
  );
}
