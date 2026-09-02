"use client";

export default function PrintButton() {
  return (
    <div className="no-print flex flex-col gap-1.5">
      <button type="button" onClick={() => window.print()} className="btn-big bg-slate-600">
        🖨️ Tải / In báo cáo (PDF)
      </button>
      <p className="text-xs text-slate-400 text-center">
        Điện thoại: chọn &quot;Lưu file PDF&quot; / &quot;Save to Files&quot; trong hộp thoại hiện ra. Máy tính: chọn
        máy in &quot;Save as PDF&quot;. File sẽ lưu vào nơi bạn chọn (thường là mục Tải xuống/Downloads).
      </p>
    </div>
  );
}
