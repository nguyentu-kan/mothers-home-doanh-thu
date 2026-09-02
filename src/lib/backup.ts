import JSZip from "jszip";
import { prisma } from "@/lib/prisma";
import { formatDateTimeVn } from "@/lib/format";
import { format } from "date-fns";

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toCsv(header: string[], rows: (string | number)[][]) {
  const lines = [header.join(",")];
  for (const row of rows) {
    lines.push(row.map((v) => csvEscape(String(v))).join(","));
  }
  return "﻿" + lines.join("\r\n");
}

const DIACRITICS_REGEX = new RegExp("[\\u0300-\\u036f]", "g");
function safeSlug(text: string) {
  return text
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .slice(0, 30);
}

const OTA_PLATFORM_LABEL: Record<string, string> = { AGODA: "Agoda", CTRIP: "Ctrip", BOOKING: "Booking.com", KHAC: "Khác" };
const EXPENSE_CATEGORY_LABEL: Record<string, string> = {
  MAT_BANG: "Mặt bằng",
  LUONG: "Lương",
  MUA_HANG: "Mua hàng",
  KHAC: "Khác",
};
const METHOD_LABEL: Record<string, string> = { TIEN_MAT: "Tiền mặt", CHUYEN_KHOAN: "Chuyển khoản", GHI_PHONG: "Ghi phòng" };
const SHIFT_LABEL: Record<string, string> = { SANG: "Sáng", CHIEU: "Chiều", DEM: "Đêm" };

// Toàn bộ dữ liệu từ trước tới nay, đóng gói thành 1 file ZIP — dùng chung cho nút tải tay
// ("Xuất toàn bộ dữ liệu") và cho tác vụ tự động gửi lên Google Drive định kỳ.
export async function generateBackupZip(generatedByName: string): Promise<Uint8Array> {
  const [rooms, otas, expenses, services, pending, handovers] = await Promise.all([
    prisma.roomRevenueEntry.findMany({ include: { recordedByUser: true }, orderBy: { time: "asc" } }),
    prisma.otaReceivable.findMany({ include: { recordedByUser: true }, orderBy: { date: "asc" } }),
    prisma.expense.findMany({ include: { recordedByUser: true }, orderBy: { time: "asc" } }),
    prisma.serviceRecord.findMany({ include: { recordedByUser: true }, orderBy: { time: "asc" } }),
    prisma.pendingReceivable.findMany({
      include: { recordedByUser: true, collectedByUser: true },
      orderBy: { time: "asc" },
    }),
    prisma.shiftHandover.findMany({
      include: { handoverUser: true, receiverUser: true },
      orderBy: { date: "asc" },
    }),
  ]);

  const zip = new JSZip();

  zip.file(
    "doc-huong-dan.txt",
    `Bản sao lưu toàn bộ dữ liệu Sổ Thu Chi Mother's Home\n` +
      `Xuất lúc: ${formatDateTimeVn(new Date())} — bởi ${generatedByName}\n\n` +
      `Các file CSV mở được bằng Excel/Google Sheets. Thư mục chung-tu/ chứa toàn bộ ảnh đính kèm.`
  );

  zip.file(
    "thu-phong.csv",
    toCsv(
      ["Thời gian", "Số tiền", "Hình thức", "TK nhận (nếu CK)", "Ghi chú", "Người ghi", "Số ảnh đính kèm"],
      rooms.map((r) => [
        formatDateTimeVn(r.time),
        r.amount,
        METHOD_LABEL[r.method],
        r.transferAccount === "TIEN" ? "TK Tiên" : r.transferAccount === "VAN" ? "TK Cô Vân" : "",
        r.note || "",
        r.recordedByUser.name,
        r.attachmentUrls.length,
      ])
    )
  );

  zip.file(
    "ota-cong-no.csv",
    toCsv(
      ["Ngày", "Sàn", "Số tiền", "Ghi chú", "Người ghi", "Số ảnh đính kèm"],
      otas.map((o) => [
        formatDateTimeVn(o.date),
        OTA_PLATFORM_LABEL[o.platform],
        o.amount,
        o.note || "",
        o.recordedByUser.name,
        o.attachmentUrls.length,
      ])
    )
  );

  zip.file(
    "chi-phi.csv",
    toCsv(
      ["Thời gian", "Hạng mục", "Số tiền", "Hình thức", "Lý do", "Người ghi", "Số ảnh đính kèm"],
      expenses.map((e) => [
        formatDateTimeVn(e.time),
        EXPENSE_CATEGORY_LABEL[e.category],
        e.amount,
        METHOD_LABEL[e.method],
        e.note,
        e.recordedByUser.name,
        e.attachmentUrls.length,
      ])
    )
  );

  zip.file(
    "dich-vu-ca-phe-spa.csv",
    toCsv(
      ["Thời gian", "Loại", "Nội dung", "Số lượng", "Đơn giá", "Thành tiền", "Hình thức", "Phòng/Khách", "Người ghi"],
      services.map((s) => [
        formatDateTimeVn(s.time),
        s.category === "CA_PHE" ? "Cà phê" : "Spa",
        s.content,
        s.quantity,
        s.unitPrice,
        s.amount,
        METHOD_LABEL[s.paymentMethod],
        s.roomOrGuest,
        s.recordedByUser.name,
      ])
    )
  );

  zip.file(
    "con-phai-thu.csv",
    toCsv(
      ["Thời gian ghi", "Số tiền", "Ghi chú", "Trạng thái", "Người ghi", "Thu bởi", "Thời gian thu"],
      pending.map((p) => [
        formatDateTimeVn(p.time),
        p.amount,
        p.note || "",
        p.status === "PENDING" ? "Chưa thu" : "Đã thu",
        p.recordedByUser.name,
        p.collectedByUser?.name || "",
        p.collectedAt ? formatDateTimeVn(p.collectedAt) : "",
      ])
    )
  );

  zip.file(
    "ban-giao-ca.csv",
    toCsv(
      [
        "Ngày",
        "Ca",
        "Người giao",
        "Người nhận",
        "Tiền đầu ca",
        "Tiền cuối ca (tính)",
        "Tiền cuối ca (đếm)",
        "Ghi chú việc dở dang",
      ],
      handovers.map((h) => [
        formatDateTimeVn(h.date),
        SHIFT_LABEL[h.shiftType],
        h.handoverUser.name,
        h.receiverUser.name,
        h.cashStart,
        h.cashEndCalculated,
        h.cashEndCounted ?? "",
        h.pendingNotes || "",
      ])
    )
  );

  // Toàn bộ ảnh đính kèm — gộp từ Thu phòng/OTA/Chi phí, đặt tên rõ ràng theo ngày/loại/số tiền.
  const attachmentSources: { time: Date; type: string; amount: number; urls: string[] }[] = [
    ...rooms.map((r) => ({ time: r.time, type: "ThuPhong", amount: r.amount, urls: r.attachmentUrls })),
    ...otas.map((o) => ({ time: o.date, type: "OTA", amount: o.amount, urls: o.attachmentUrls })),
    ...expenses.map((e) => ({ time: e.time, type: "ChiPhi", amount: e.amount, urls: e.attachmentUrls })),
  ];
  const usedNames = new Set<string>();
  await Promise.all(
    attachmentSources.flatMap((src) =>
      src.urls.map(async (url) => {
        try {
          const res = await fetch(url);
          if (!res.ok) return;
          const buffer = Buffer.from(await res.arrayBuffer());
          const urlExt = url.split(".").pop()?.split("?")[0] || "jpg";
          const baseName = `${format(src.time, "yyyy-MM-dd")}_${safeSlug(src.type)}_${src.amount}`;
          let fileName = `${baseName}.${urlExt}`;
          let counter = 2;
          while (usedNames.has(fileName)) {
            fileName = `${baseName}_${counter}.${urlExt}`;
            counter++;
          }
          usedNames.add(fileName);
          zip.file(`chung-tu/${fileName}`, buffer);
        } catch {
          // Bỏ qua ảnh lỗi, không chặn cả gói backup
        }
      })
    )
  );

  return zip.generateAsync({ type: "uint8array" });
}
