export type DraftEntryType =
  | "ROOM_TIEN_MAT"
  | "ROOM_CHUYEN_KHOAN"
  | "OTA"
  | "CON_THU"
  | "CHUYEN_CHO_CO_VAN"
  | "CHI_MAT_BANG"
  | "CHI_LUONG"
  | "CHI_MUA_HANG"
  | "CHI_KHAC";

export type DraftEntry = {
  type: DraftEntryType;
  amount: number;
  note: string;
  date: string | null;
  // Nếu khoản này được đọc ra TỪ 1 ảnh chụp màn hình chuyển khoản cụ thể (vd bằng chứng chuyển
  // tiền cho Cô Vân), đây là chỉ số (đếm từ 0) của ảnh đó trong danh sách ảnh đã gửi lên — dùng để
  // đính kèm đúng ảnh đó làm bằng chứng khi lưu. null nếu khoản này không gắn với 1 ảnh cụ thể.
  imageIndex: number | null;
};

const DRAFT_TYPES: DraftEntryType[] = [
  "ROOM_TIEN_MAT",
  "ROOM_CHUYEN_KHOAN",
  "OTA",
  "CON_THU",
  "CHUYEN_CHO_CO_VAN",
  "CHI_MAT_BANG",
  "CHI_LUONG",
  "CHI_MUA_HANG",
  "CHI_KHAC",
];

const SYSTEM_PROMPT = `Bạn là trợ lý đọc sổ thu chi cho một khách sạn nhỏ ở Việt Nam.
Đọc nội dung được cung cấp (có thể là ảnh chụp sổ tay viết tay, ảnh hoá đơn/chuyển khoản, hoặc đoạn chữ do nhân viên đọc/gõ) và trích xuất TẤT CẢ các khoản Thu hoặc Chi tìm thấy.

Mỗi khoản trả về 1 object với các trường:
- type: bắt buộc là một trong: "ROOM_TIEN_MAT" (thu tiền phòng bằng tiền mặt), "ROOM_CHUYEN_KHOAN" (thu tiền phòng qua chuyển khoản), "OTA" (công nợ từ Agoda/Ctrip/Booking...), "CON_THU" (khách còn nợ trực tiếp khách sạn, CHƯA thu được tiền — xem hướng dẫn "còn thu Y" bên dưới), "CHUYEN_CHO_CO_VAN" (Ngọc Tiên chuyển khoản tiền cho Cô Vân — xem hướng dẫn riêng bên dưới), "CHI_MAT_BANG" (chi tiền thuê mặt bằng), "CHI_LUONG" (chi trả lương), "CHI_MUA_HANG" (chi mua hàng/nguyên vật liệu/đồ dùng), "CHI_KHAC" (chi phí khác không rõ loại)
- amount: số tiền, đơn vị VNĐ, là số nguyên (vd 500000, không phải "500k" hay "500.000đ")
- note: ghi chú ngắn gọn (số phòng, tên khách, lý do chi...), nếu không có thì để chuỗi rỗng
- date: BẮT BUỘC đúng định dạng "YYYY-MM-DD" (4 số năm - 2 số tháng - 2 số ngày) nếu đọc được. Ký hiệu Việt Nam luôn là ngày/tháng, KHÔNG phải tháng/ngày — vd sổ ghi "9/8" nghĩa là ngày 9 tháng 8, năm hiện tại là ${new Date().getFullYear()}, phải trả về "${new Date().getFullYear()}-08-09". Nếu không đọc được ngày rõ ràng, để null — TUYỆT ĐỐI không trả về dạng "9/8" hay bất kỳ định dạng nào khác ngoài YYYY-MM-DD hoặc null.
- imageIndex: nếu khoản này được đọc TỪ 1 ẢNH CHỤP MÀN HÌNH CHUYỂN KHOẢN cụ thể (xem "Ảnh số N:" ngay trước mỗi ảnh được gửi), trả về đúng số N của ảnh đó. Nếu khoản này đọc từ ảnh sổ tay/ghi chú (không phải ảnh chụp màn hình riêng cho khoản này) hoặc từ chữ gõ tay, để null.

Nhận diện ẢNH CHỤP MÀN HÌNH CHUYỂN KHOẢN (khác với ảnh chụp sổ tay viết tay): thường là giao diện app ngân hàng/ví điện tử, có chữ như "Giao dịch thành công", "Chuyển tiền thành công", số tiền lớn ở giữa, tên/số tài khoản người nhận, mã giao dịch. Nếu 1 ảnh thuộc dạng này VÀ người nhận có tên gần giống "Cô Vân"/tên chủ khách sạn (hoặc không ghi rõ người nhận nhưng ngữ cảnh cho thấy đây là chuyển tiền nội bộ, không phải khách trả tiền phòng) — trích xuất thành 1 khoản type "CHUYEN_CHO_CO_VAN", amount = số tiền trên ảnh, note = tên người nhận nếu có, và BẮT BUỘC set đúng imageIndex = số thứ tự ảnh đó.

Nếu không chắc chắn khoản đó là Thu tiền mặt hay chuyển khoản, ưu tiên chọn ROOM_TIEN_MAT cho khoản Thu, và CHI_KHAC cho khoản Chi.

Ghi chú quan trọng — nhân viên khách sạn thường ghi tắt theo tình trạng phòng, không phải liệt kê Thu/Chi rõ ràng từng dòng. Hãy hiểu như sau:
- Dòng chỉ ghi số phòng (vd "P402", "P203-301") kèm "in" (nhận phòng) hoặc "out" (trả phòng) mà KHÔNG có số tiền đi kèm — đây CHỈ là ghi chú tình trạng phòng, KHÔNG PHẢI khoản thu/chi, KHÔNG trích xuất dòng này.
- Dòng có tên sàn OTA (Agoda, Booking, Ctrip, Traveloka...) kèm số tiền cuối dòng — đây là khoản OTA công nợ (type "OTA"), amount = số tiền đó.
- Chữ "cọc X" hoặc "đã cọc X" hoặc "nhận cọc X" — đây LÀ tiền đã thực nhận, trích xuất thành khoản Thu (amount = X). Nếu thấy "ck" gần đó thì dùng ROOM_CHUYEN_KHOAN, nếu thấy "TM" thì dùng ROOM_TIEN_MAT, không thấy gì thì mặc định ROOM_TIEN_MAT.
- Chữ "còn thu Y" hoặc "còn lại Y" — đây là số tiền KHÁCH CÒN NỢ, CHƯA thu được. TUYỆT ĐỐI KHÔNG tính là khoản Thu (ROOM_TIEN_MAT/ROOM_CHUYEN_KHOAN) — thay vào đó trích xuất thành khoản riêng type "CON_THU", amount = Y, để theo dõi và thu sau (trừ khi cùng dòng có chữ "đã TT"/"đã thanh toán" xác nhận đã thu đủ, lúc đó Y là khoản Thu thật (ROOM_TIEN_MAT/ROOM_CHUYEN_KHOAN), không phải CON_THU).
- "in ck 700.000" hoặc "in TM 800.000" (ghi ngay lúc nhận phòng, kèm hình thức + số tiền, KHÔNG có dòng "đã cọc"/"còn thu" nào theo sau nói về CÙNG khoản đó) — đây LÀ khoản Thu phòng thật, trích xuất bình thường theo hình thức tương ứng.
- QUAN TRỌNG — tránh đếm trùng: nếu một dòng ghi tổng giá trị đặt phòng kèm hình thức (vd "ck 600.000") nhưng NGAY SAU ĐÓ có dòng "đã cọc X. Còn thu Y" giải thích rằng trong tổng đó chỉ mới thu X, còn nợ Y — thì con số tổng đầu dòng (600.000) CHỈ LÀ giá trị đặt phòng tham khảo, KHÔNG PHẢI tiền đã nhận, TUYỆT ĐỐI KHÔNG trích xuất số đó. Chỉ trích xuất X (khoản "đã cọc") là khoản Thu thật duy nhất của trường hợp này.
- "đã TT" (đã thanh toán) đứng một mình không kèm số tiền mới — bỏ qua, không trích xuất (đã được tính từ trước).

Chỉ trả về mảng JSON các khoản mục, không giải thích, không thêm chữ nào khác.`;

function getApiKey(): string | null {
  return process.env.GEMINI_API_KEY || null;
}

// Gọi Gemini với 1 bộ "parts" (chữ + ảnh) và 1 schema JSON mong muốn — dùng chung cho cả
// parseQuickCapture (đọc cả sổ tay) lẫn extractTransferInfo (chỉ đọc 1 ảnh chuyển khoản riêng lẻ).
// Trả về JSON đã parse, hoặc { error } — không tự validate cấu trúc bên trong, caller tự kiểm tra.
async function callGemini(
  parts: Record<string, unknown>[],
  schema: Record<string, unknown>
): Promise<{ data: unknown } | { error: string }> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { error: "Chưa cấu hình GEMINI_API_KEY — vui lòng báo Quản lý cấu hình trước." };
  }

  const body = {
    contents: [{ parts }],
    generationConfig: { responseMimeType: "application/json", responseSchema: schema },
  };

  // Dùng tên model cụ thể thay vì alias "gemini-flash-latest" — alias này từng bị treo/không
  // phản hồi hoàn toàn phía Google dù các model cụ thể khác vẫn chạy bình thường. Nếu Google
  // khai tử "gemini-2.5-flash" sau này, đổi sang tên model còn hoạt động khác tại đây.
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  let response: Response | null = null;
  // Model mới nhất đôi khi quá tải tạm thời (503) — thử lại vài lần trước khi báo lỗi cho người dùng.
  // Gemini đôi khi không phản hồi gì cả (không lỗi, không trả kết quả) — đặt giới hạn thời gian chờ
  // để không bị treo "Đang đọc..." vô thời hạn.
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30_000),
      });
    } catch (err) {
      if (err instanceof Error && err.name === "TimeoutError") {
        return { error: "Gemini không phản hồi (quá thời gian chờ). Vui lòng thử lại." };
      }
      return { error: "Không kết nối được tới Gemini. Kiểm tra lại mạng và thử lại." };
    }
    if (response.ok || response.status !== 503 || attempt === 3) break;
    await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
  }

  if (!response!.ok) {
    if (response!.status === 429) {
      return { error: "Gemini đang quá tải (vượt hạn mức miễn phí). Vui lòng thử lại sau ít phút." };
    }
    if (response!.status === 503) {
      return { error: "Gemini đang quá tải tạm thời. Vui lòng thử lại sau vài giây." };
    }
    return { error: `Gemini báo lỗi (mã ${response!.status}). Vui lòng thử lại.` };
  }
  response = response!;

  const json = await response.json();
  const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    return { error: "Không đọc được nội dung. Vui lòng thử lại với ảnh rõ hơn." };
  }

  try {
    return { data: JSON.parse(rawText) };
  } catch {
    return { error: "AI trả về dữ liệu không hợp lệ. Vui lòng thử lại." };
  }
}

export async function parseQuickCapture(input: {
  images?: { data: string; mimeType: string }[];
  text?: string;
}): Promise<{ entries: DraftEntry[] } | { error: string }> {
  const parts: Record<string, unknown>[] = [{ text: SYSTEM_PROMPT }];
  if (input.text?.trim()) {
    parts.push({ text: `Nội dung cần đọc:\n${input.text.trim()}` });
  }
  (input.images ?? []).forEach((img, index) => {
    parts.push({ text: `Ảnh số ${index}:` });
    parts.push({ inline_data: { mime_type: img.mimeType, data: img.data } });
  });

  if (parts.length === 1) {
    return { error: "Chưa có ảnh hoặc nội dung nào để đọc." };
  }

  const schema = {
    type: "ARRAY",
    items: {
      type: "OBJECT",
      properties: {
        type: { type: "STRING", enum: DRAFT_TYPES },
        amount: { type: "INTEGER" },
        note: { type: "STRING" },
        date: { type: "STRING", nullable: true },
        imageIndex: { type: "INTEGER", nullable: true },
      },
      required: ["type", "amount"],
    },
  };

  const result = await callGemini(parts, schema);
  if ("error" in result) return result;

  if (!Array.isArray(result.data)) {
    return { error: "AI không tìm thấy khoản thu/chi nào rõ ràng. Vui lòng thử lại." };
  }

  const imageCount = input.images?.length ?? 0;
  const entries: DraftEntry[] = result.data
    .filter(
      (e): e is { type: string; amount: number; note?: string; date?: string | null; imageIndex?: number | null } =>
        e && typeof e.amount === "number" && DRAFT_TYPES.includes(e.type)
    )
    .map((e) => ({
      type: e.type as DraftEntryType,
      amount: Math.round(e.amount),
      note: e.note || "",
      // Chỉ chấp nhận đúng định dạng YYYY-MM-DD — phòng trường hợp AI lỡ trả sai định dạng
      // (vd "9/8") dù đã dặn trong prompt, tránh hiểu nhầm ngày/tháng khi lưu vào database.
      date: e.date && /^\d{4}-\d{2}-\d{2}$/.test(e.date) ? e.date : null,
      // Chỉ chấp nhận chỉ số hợp lệ trong phạm vi số ảnh thật đã gửi lên, phòng AI trả số sai.
      imageIndex:
        typeof e.imageIndex === "number" && e.imageIndex >= 0 && e.imageIndex < imageCount ? e.imageIndex : null,
    }));

  if (entries.length === 0) {
    return { error: "Không tìm thấy khoản thu/chi nào rõ ràng trong nội dung này. Vui lòng thử lại." };
  }

  return { entries };
}

export type TransferInfo = { amount: number | null; date: string | null; transactionCode: string | null };

const TRANSFER_INFO_PROMPT = `Ảnh này CÓ THỂ là ảnh chụp màn hình xác nhận chuyển khoản/giao dịch thành công từ app ngân hàng hoặc ví điện tử Việt Nam.
Nếu đúng vậy, đọc và trả về:
- amount: số tiền giao dịch, đơn vị VNĐ, số nguyên (vd 2000000). Nếu không đọc được, để null.
- date: ngày giao dịch hiển thị trên ảnh (thường ở dòng "Thời gian"/"Thời điểm giao dịch"), đúng định dạng "YYYY-MM-DD". Ký hiệu Việt Nam luôn là ngày/tháng. Nếu không đọc được ngày rõ ràng, để null.
- transactionCode: mã giao dịch/mã tham chiếu hiển thị trên ảnh (thường ở dòng "Mã giao dịch"/"Mã tham chiếu"/"Mã GD"/"Transaction ID", thường là chuỗi số hoặc chữ+số). Nếu không thấy, để null.
Nếu ảnh KHÔNG phải ảnh chuyển khoản (vd ảnh sổ tay viết tay, ảnh khác), trả về amount: null, date: null, transactionCode: null.
Chỉ trả về đúng 1 object JSON, không giải thích gì thêm.`;

// Đọc nhanh 1 ảnh riêng lẻ (dùng cho Kho ảnh chứng từ) để gợi ý sẵn ngày/số tiền/mã giao dịch — AI đọc
// được gì thì gợi ý đó, không bắt buộc đúng 100%, người dùng vẫn xác nhận lại trước khi lưu thành khoản.
export async function extractTransferInfo(image: { data: string; mimeType: string }): Promise<TransferInfo> {
  const parts: Record<string, unknown>[] = [
    { text: TRANSFER_INFO_PROMPT },
    { inline_data: { mime_type: image.mimeType, data: image.data } },
  ];
  const schema = {
    type: "OBJECT",
    properties: {
      amount: { type: "INTEGER", nullable: true },
      date: { type: "STRING", nullable: true },
      transactionCode: { type: "STRING", nullable: true },
    },
  };

  const result = await callGemini(parts, schema);
  if ("error" in result) return { amount: null, date: null, transactionCode: null };

  const data = result.data as { amount?: number | null; date?: string | null; transactionCode?: string | null };
  return {
    amount: typeof data?.amount === "number" ? Math.round(data.amount) : null,
    date: data?.date && /^\d{4}-\d{2}-\d{2}$/.test(data.date) ? data.date : null,
    transactionCode: typeof data?.transactionCode === "string" && data.transactionCode.trim() ? data.transactionCode.trim() : null,
  };
}
