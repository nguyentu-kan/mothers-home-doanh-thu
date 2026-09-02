"use client";

import { useState, useTransition } from "react";
import { deleteServiceRecordAction } from "./actions";
import { formatVnd, formatTimeVn } from "@/lib/format";

type Entry = {
  id: string;
  time: Date;
  category: "CA_PHE" | "SPA";
  content: string;
  roomOrGuest: string;
  amount: number;
};

export default function TodayEntriesList({ entries }: { entries: Entry[] }) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleDelete(id: string) {
    if (!confirm("Xoá lượt ghi này?")) return;
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      const result = await deleteServiceRecordAction(id);
      setPendingId(null);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="card">
      <div className="font-bold text-[#1B3A5C] dark:text-white mb-2">Đã ghi hôm nay ({entries.length})</div>
      {error && <p className="rounded-xl bg-red-100 px-4 py-3 text-red-800 font-semibold mb-2">{error}</p>}
      {entries.length === 0 ? (
        <p className="text-sm text-slate-500">Chưa ghi lượt nào hôm nay.</p>
      ) : (
        <div className="flex flex-col divide-y divide-black/5 dark:divide-white/5">
          {entries.map((e) => (
            <div key={e.id} className="flex items-center justify-between py-2 gap-2">
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">
                  {e.category === "CA_PHE" ? "☕" : "💆"} {e.content} — {e.roomOrGuest}
                </div>
                <div className="text-xs text-slate-500">{formatTimeVn(e.time)}</div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-bold">{formatVnd(e.amount)}</span>
                <button
                  type="button"
                  onClick={() => handleDelete(e.id)}
                  disabled={pendingId === e.id}
                  className="text-red-600 font-semibold text-sm disabled:opacity-50"
                >
                  {pendingId === e.id ? "..." : "🗑️"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
