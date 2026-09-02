import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { requireSession } from "@/lib/session";
import { isManager } from "@/lib/permissions";
import { getPeriodRange, type PeriodKey } from "@/lib/period";
import { getActivityRows } from "@/lib/activity";
import { format } from "date-fns";

const DIACRITICS_REGEX = new RegExp("[\\u0300-\\u036f]", "g");

function safeSlug(text: string) {
  return text
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .slice(0, 20);
}

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (!isManager(session.role)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const period = (searchParams.get("period") || "week") as PeriodKey;
  const fromParam = searchParams.get("from") || undefined;
  const toParam = searchParams.get("to") || undefined;
  const { from, to } = getPeriodRange(period, fromParam, toParam);

  const rows = await getActivityRows(from, to);
  const attachments = rows.flatMap((row) => row.attachmentUrls.map((url) => ({ row, url })));

  if (attachments.length === 0) {
    return new NextResponse("Không có chứng từ nào có ảnh trong khoảng thời gian này.", { status: 404 });
  }

  const zip = new JSZip();
  const usedNames = new Set<string>();

  await Promise.all(
    attachments.map(async ({ row, url }) => {
      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const buffer = Buffer.from(await res.arrayBuffer());
        const urlExt = url.split(".").pop()?.split("?")[0] || "jpg";
        const baseName = `${format(row.time, "yyyy-MM-dd")}_${safeSlug(row.type)}_${row.amount}`;
        let fileName = `${baseName}.${urlExt}`;
        let counter = 2;
        while (usedNames.has(fileName)) {
          fileName = `${baseName}_${counter}.${urlExt}`;
          counter++;
        }
        usedNames.add(fileName);
        zip.file(fileName, buffer);
      } catch {
        // Bỏ qua ảnh lỗi, không chặn cả gói zip
      }
    })
  );

  const zipBuffer = await zip.generateAsync({ type: "uint8array" });
  const zipBlob = new Blob([new Uint8Array(zipBuffer)], { type: "application/zip" });

  return new NextResponse(zipBlob, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="chung-tu-${period}.zip"`,
    },
  });
}
