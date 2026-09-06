import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";
import { requireSession } from "@/lib/session";
import { isManager } from "@/lib/permissions";
import { getPeriodRange, type PeriodKey } from "@/lib/period";
import { getActivityRows } from "@/lib/activity";
import { buildActivityReportWorkbook } from "@/lib/report-export";
import { prisma } from "@/lib/prisma";

// Tên file có ngày cụ thể (không chỉ "week"/"month") để dù tải về lúc nào, mở lại sau này vẫn biết
// ngay đây là báo cáo của khoảng thời gian nào — viết không dấu, không khoảng trắng cho an toàn khi
// lưu trên mọi hệ điều hành/app.
function buildExportFilename(from: Date, to: Date): string {
  const fromStr = format(from, "dd-MM-yyyy");
  const toStr = format(to, "dd-MM-yyyy");
  const range = fromStr === toStr ? fromStr : `${fromStr}_den_${toStr}`;
  return `Mothers-Home-Bao-cao-chi-tiet_${range}.xlsx`;
}

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (!isManager(session.role)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const period = (searchParams.get("period") || "week") as PeriodKey;
  const userId = searchParams.get("userId") || undefined;
  const fromParam = searchParams.get("from") || undefined;
  const toParam = searchParams.get("to") || undefined;
  const { from, to } = getPeriodRange(period, fromParam, toParam);

  const [rows, filterUser] = await Promise.all([
    getActivityRows(from, to, userId),
    userId ? prisma.user.findUnique({ where: { id: userId }, select: { name: true } }) : Promise.resolve(null),
  ]);

  const buffer = await buildActivityReportWorkbook({
    rows,
    from,
    to,
    filterName: filterUser?.name,
    exportedByName: session.name || session.username || "",
  });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${buildExportFilename(from, to)}"`,
    },
  });
}
