import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { isManager } from "@/lib/permissions";
import { getPeriodRange, type PeriodKey } from "@/lib/period";
import { getActivityRows } from "@/lib/activity";
import { formatDateTimeVn } from "@/lib/format";

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
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

  const rows = await getActivityRows(from, to, userId);

  const header = ["Thời gian", "Loại", "Nội dung", "Số tiền", "Hình thức", "Người ghi", "Link chứng từ"];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        csvEscape(formatDateTimeVn(r.time)),
        csvEscape(r.type),
        csvEscape(r.description),
        String(r.amount),
        csvEscape(r.method),
        csvEscape(r.recordedByName),
        csvEscape(r.attachmentUrl || ""),
      ].join(",")
    );
  }

  const csvContent = "﻿" + lines.join("\r\n");

  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bao-cao-${period}.csv"`,
    },
  });
}
