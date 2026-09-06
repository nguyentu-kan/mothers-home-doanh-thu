import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { isManager } from "@/lib/permissions";
import { getPeriodRange, type PeriodKey } from "@/lib/period";
import { getActivityRows } from "@/lib/activity";
import { buildActivityReportWorkbook } from "@/lib/report-export";
import { prisma } from "@/lib/prisma";

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
      "Content-Disposition": `attachment; filename="Bao-cao-chi-tiet-${period}.xlsx"`,
    },
  });
}
