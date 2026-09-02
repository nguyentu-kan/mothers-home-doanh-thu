import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { canManageCashbook } from "@/lib/permissions";
import { generateBackupZip } from "@/lib/backup";
import { format } from "date-fns";

// Toàn bộ dữ liệu từ trước tới nay — để Ngọc Tiên tự tải về lưu định kỳ (vd đưa lên Google Drive)
// phòng khi có sự cố, vì app hiện chưa có "thùng rác"/hoàn tác.
export async function GET() {
  const session = await requireSession();
  if (!canManageCashbook(session)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const zipBuffer = await generateBackupZip(session.name || "Không rõ");
  const zipBlob = new Blob([new Uint8Array(zipBuffer)], { type: "application/zip" });

  return new NextResponse(zipBlob, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="sao-luu-mothers-home-${format(new Date(), "yyyy-MM-dd")}.zip"`,
    },
  });
}
