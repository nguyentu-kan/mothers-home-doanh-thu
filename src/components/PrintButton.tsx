"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print btn-big bg-slate-600"
    >
      🖨️ Tải / In báo cáo (PDF)
    </button>
  );
}
