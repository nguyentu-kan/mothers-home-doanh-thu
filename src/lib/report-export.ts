import ExcelJS from "exceljs";
import type { ActivityRow } from "@/lib/activity";
import { formatDateTimeVn, formatDateVn, formatVnd } from "@/lib/format";

const HOTEL_NAME = "KHÁCH SẠN MOTHER'S HOME";
const HOTEL_ADDRESS = "72 Nguyễn Khoái, P. Vĩnh Hội, Q.4, TP.HCM";
const HEADER_BG = "FF1B3A5C";
const HEADER_FG = "FFFFFFFF";
const MUTED = "FF888888";
const RED = "FFB91C1C";
const GREEN = "FF0E7C66";
const DEBT_BLUE = "FF1B5EAA";

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FFD9D9D9" } },
  left: { style: "thin", color: { argb: "FFD9D9D9" } },
  bottom: { style: "thin", color: { argb: "FFD9D9D9" } },
  right: { style: "thin", color: { argb: "FFD9D9D9" } },
};

const COLUMNS = [
  { header: "Thời gian", width: 18 },
  { header: "Loại", width: 18 },
  { header: "Sàn", width: 12 },
  { header: "Nội dung", width: 44 },
  { header: "Số tiền", width: 16 },
  { header: "Hình thức", width: 24 },
  { header: "Người ghi", width: 14 },
  { header: "Link chứng từ", width: 18 },
];
const LAST_COL = COLUMNS.length;
const AMOUNT_COL = 5;

// OTA công nợ/Còn phải thu CHƯA có tiền thật — tô màu xanh dương khác với tiền mặt/CK (đen) và chi
// phí (đỏ) để không lỡ đọc nhầm là tiền đã có trong tay, dù chung 1 cột Số tiền.
function isDebtRow(kind: ActivityRow["kind"]): boolean {
  return kind === "OTA" || kind === "PENDING";
}

// Khoản "Còn phải thu" (chưa có tiền thật) và "Chuyển tiếp cho Cô Vân" (đã tính vào Thu ở chỗ khác,
// đây chỉ là điều chuyển nội bộ) KHÔNG được tính vào Thu-Chi thật — đúng công thức app đang dùng ở
// mọi nơi khác (vd summarizeByDate trong QuickCaptureForm) để số Tổng cộng khớp với báo cáo chính.
function computeTotal(rows: ActivityRow[]): number {
  return rows.filter((r) => r.kind !== "PENDING" && r.kind !== "OWNER_TRANSFER").reduce((sum, r) => sum + r.amount, 0);
}

export async function buildActivityReportWorkbook(params: {
  rows: ActivityRow[];
  from: Date;
  to: Date;
  filterName?: string;
  exportedByName: string;
}): Promise<ExcelJS.Buffer> {
  const { rows, from, to, filterName, exportedByName } = params;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sổ Thu Chi Mother's Home";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Chi tiết", {
    views: [{ state: "frozen", ySplit: 6 }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  sheet.columns = COLUMNS.map((c) => ({ width: c.width }));

  function titleRow(rowIndex: number, text: string, font: Partial<ExcelJS.Font>) {
    sheet.mergeCells(rowIndex, 1, rowIndex, LAST_COL);
    const cell = sheet.getCell(rowIndex, 1);
    cell.value = text;
    cell.font = font;
    cell.alignment = { horizontal: "center" };
  }

  titleRow(1, HOTEL_NAME, { bold: true, size: 14, color: { argb: HEADER_BG } });
  titleRow(2, HOTEL_ADDRESS, { size: 10, color: { argb: MUTED } });
  titleRow(3, "BÁO CÁO CHI TIẾT THU CHI", { bold: true, size: 12 });
  const periodLine =
    `Kỳ báo cáo: ${formatDateVn(from)} – ${formatDateVn(to)}` + (filterName ? `  —  Nhân viên: ${filterName}` : "");
  titleRow(4, periodLine, { size: 10, color: { argb: MUTED } });
  sheet.getRow(5).height = 8;

  const headerRow = sheet.getRow(6);
  COLUMNS.forEach((c, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = c.header;
    cell.font = { bold: true, color: { argb: HEADER_FG } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = THIN_BORDER;
  });
  headerRow.height = 20;

  let r = 7;
  for (const row of rows) {
    const excelRow = sheet.getRow(r);
    excelRow.getCell(1).value = formatDateTimeVn(row.time);
    excelRow.getCell(2).value = row.type;
    excelRow.getCell(3).value = row.platform || "";
    excelRow.getCell(4).value = row.description;

    const amountCell = excelRow.getCell(AMOUNT_COL);
    amountCell.value = row.amount;
    amountCell.numFmt = '#,##0" đ"';
    amountCell.alignment = { horizontal: "right", vertical: "middle" };
    if (row.amount < 0) amountCell.font = { color: { argb: RED } };
    else if (isDebtRow(row.kind)) amountCell.font = { color: { argb: DEBT_BLUE } };

    excelRow.getCell(6).value = row.method;
    excelRow.getCell(7).value = row.recordedByName;

    const attachCell = excelRow.getCell(8);
    if (row.attachmentUrls.length === 1) {
      attachCell.value = { text: "📎 Xem chứng từ", hyperlink: row.attachmentUrls[0] };
      attachCell.font = { color: { argb: DEBT_BLUE }, underline: true };
    } else if (row.attachmentUrls.length > 1) {
      attachCell.value = row.attachmentUrls.join(" | ");
    }

    for (let c = 1; c <= LAST_COL; c++) {
      const cell = excelRow.getCell(c);
      cell.border = THIN_BORDER;
      if (c !== AMOUNT_COL) cell.alignment = { vertical: "middle", wrapText: c === 4 };
    }
    r++;
  }

  // Dùng công thức Excel thật (SUM trừ 2 khoản không tính) thay vì số tính sẵn — sửa/xoá dòng nào
  // trong bảng thì dòng Tổng cộng tự cập nhật lại, bấm vào ô là thấy ngay công thức. "Chuyển tiếp
  // cho Cô Vân" và "Còn phải thu" phải trừ ra bằng SUMIF (dựa theo cột "Loại") — cộng cả 2 dòng đó
  // vào sẽ bị tính trùng/tính vào tiền chưa thu thật (xem computeTotal để rõ lý do).
  const firstDataRow = 7;
  const lastDataRow = Math.max(r - 1, firstDataRow);
  const typeCol = sheet.getColumn(2).letter;
  const amountCol = sheet.getColumn(AMOUNT_COL).letter;
  const typeRange = `${typeCol}${firstDataRow}:${typeCol}${lastDataRow}`;
  const amountRange = `${amountCol}${firstDataRow}:${amountCol}${lastDataRow}`;

  const total = computeTotal(rows);
  const totalRow = sheet.getRow(r);
  sheet.mergeCells(r, 1, r, 4);
  totalRow.getCell(1).value = "TỔNG CỘNG (Thu − Chi, gồm cả Công nợ OTA)";
  totalRow.getCell(1).font = { bold: true };
  totalRow.getCell(1).alignment = { horizontal: "right" };
  const totalAmountCell = totalRow.getCell(AMOUNT_COL);
  totalAmountCell.value = {
    formula: `SUM(${amountRange})-SUMIF(${typeRange},"Chuyển tiếp cho Cô Vân",${amountRange})-SUMIF(${typeRange},"Còn phải thu",${amountRange})`,
    result: total,
  };
  totalAmountCell.numFmt = '#,##0" đ"';
  totalAmountCell.font = { bold: true, color: { argb: total < 0 ? RED : GREEN } };
  totalAmountCell.alignment = { horizontal: "right" };
  for (let c = 1; c <= LAST_COL; c++) {
    totalRow.getCell(c).border = { top: { style: "double", color: { argb: "FF999999" } } };
  }
  r++;

  const pendingTotal = rows.filter((row) => row.kind === "PENDING").reduce((sum, row) => sum + row.amount, 0);
  const transferTotal = rows.filter((row) => row.kind === "OWNER_TRANSFER").reduce((sum, row) => sum + row.amount, 0);
  const notes: string[] = [];
  if (pendingTotal > 0) notes.push(`Trong đó Còn phải thu (chưa tính vào Tổng cộng): ${formatVnd(pendingTotal)}`);
  if (transferTotal > 0)
    notes.push(`Đã chuyển tiếp cho Cô Vân (không tính vào Tổng cộng, không phải tiền thu mới): ${formatVnd(transferTotal)}`);
  for (const note of notes) {
    sheet.mergeCells(r, 1, r, LAST_COL);
    const cell = sheet.getCell(r, 1);
    cell.value = note;
    cell.font = { size: 9, italic: true, color: { argb: MUTED } };
    cell.alignment = { horizontal: "right" };
    r++;
  }

  r++;
  sheet.mergeCells(r, 1, r, LAST_COL);
  const footerCell = sheet.getCell(r, 1);
  footerCell.value = `Xuất bởi ${exportedByName} — ${formatDateTimeVn(new Date())}`;
  footerCell.font = { size: 9, italic: true, color: { argb: MUTED } };
  footerCell.alignment = { horizontal: "center" };

  return workbook.xlsx.writeBuffer();
}
