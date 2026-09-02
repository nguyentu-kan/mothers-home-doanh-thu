export type DraftEntryType =
  | "ROOM_TIEN_MAT"
  | "ROOM_CHUYEN_KHOAN"
  | "OTA"
  | "CHI_MAT_BANG"
  | "CHI_LUONG"
  | "CHI_MUA_HANG"
  | "CHI_KHAC";

export type DraftEntry = {
  type: DraftEntryType;
  amount: number;
  note: string;
  date: string | null;
};

const DRAFT_TYPES: DraftEntryType[] = [
  "ROOM_TIEN_MAT",
  "ROOM_CHUYEN_KHOAN",
  "OTA",
  "CHI_MAT_BANG",
  "CHI_LUONG",
  "CHI_MUA_HANG",
  "CHI_KHAC",
];

const SYSTEM_PROMPT = `Bạn là trợ lý đọc sổ thu chi cho một khách sạn nhỏ ở Việt Nam.
Đọc nội dung được cung cấp (có thể là ảnh chụp sổ tay viết tay, ảnh hoá đơn/chuyển khoản, hoặc đoạn chữ do nhân viên đọc/gõ) và trích xuất TẤT CẢ các khoản Thu hoặc Chi tìm thấy.

Mỗi khoản trả về 1 object với các trường:
- type: bắt buộc là một trong: "ROOM_TIEN_MAT" (thu tiền phòng bằng tiền mặt), "ROOM_CHUYEN_KHOAN" (thu tiền phòng qua chuyển khoản), "OTA" (công nợ từ Agoda/Ctrip/Booking...), "CHI_MAT_BANG" (chi tiền thuê mặt bằng), "CHI_LUONG" (chi trả lương), "CHI_MUA_HANG" (chi mua hàng/nguyên vật liệu/đồ dùng), "CHI_KHAC" (chi phí khác không rõ loại)
- amount: số tiền, đơn vị VNĐ, là số nguyên (vd 500000, không phải "500k" hay "500.000đ")
- note: ghi chú ngắn gọn (số phòng, tên khách, lý do chi...), nếu không có thì để chuỗi rỗng
- date: BẮT BUỘC đúng định dạng "YYYY-MM-DD" (4 số năm - 2 số tháng - 2 số ngày) nếu đọc được. Ký hiệu Việt Nam luôn là ngày/tháng, KHÔNG phải tháng/ngày — vd sổ ghi "9/8" nghĩa là ngày 9 tháng 8, năm hiện tại là ${new Date().getFullYear()}, phải trả về "${new Date().getFullYear()}-08-09". Nếu không đọc được ngày rõ ràng, để null — TUYỆT ĐỐI không trả về dạng "9/8" hay bất kỳ định dạng nào khác ngoài YYYY-MM-DD hoặc null.

Nếu không chắc chắn khoản đó là Thu tiền mặt hay chuyển khoản, ưu tiên chọn ROOM_TIEN_MAT cho khoản Thu, và CHI_KHAC cho khoản Chi.
Chỉ trả về mảng JSON các khoản mục, không giải thích, không thêm chữ nào khác.`;

function getApiKey(): string | null {
  return process.env.GEMINI_API_KEY || null;
}

export async function parseQuickCapture(input: {
  images?: { data: string; mimeType: string }[];
  text?: string;
}): Promise<{ entries: DraftEntry[] } | { error: string }> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { error: "Chưa cấu hình GEMINI_API_KEY — vui lòng báo Quản lý cấu hình trước." };
  }

  const parts: Record<string, unknown>[] = [{ text: SYSTEM_PROMPT }];
  if (input.text?.trim()) {
    parts.push({ text: `Nội dung cần đọc:\n${input.text.trim()}` });
  }
  for (const img of input.images ?? []) {
    parts.push({ inline_data: { mime_type: img.mimeType, data: img.data } });
  }

  if (parts.length === 1) {
    return { error: "Chưa có ảnh hoặc nội dung nào để đọc." };
  }

  const body = {
    contents: [{ parts }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            type: { type: "STRING", enum: DRAFT_TYPES },
            amount: { type: "INTEGER" },
            note: { type: "STRING" },
            date: { type: "STRING", nullable: true },
          },
          required: ["type", "amount"],
        },
      },
    },
  };

  let response: Response;
  try {
    response = await fetch(
      // "gemini-flash-latest" luôn trỏ tới bản flash mới nhất Google đang khuyến nghị —
      // tránh phải sửa code mỗi khi Google đổi tên/khai tử phiên bản model cụ thể.
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
  } catch {
    return { error: "Không kết nối được tới Gemini. Kiểm tra lại mạng và thử lại." };
  }

  if (!response.ok) {
    if (response.status === 429) {
      return { error: "Gemini đang quá tải (vượt hạn mức miễn phí). Vui lòng thử lại sau ít phút." };
    }
    return { error: `Gemini báo lỗi (mã ${response.status}). Vui lòng thử lại.` };
  }

  const json = await response.json();
  const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    return { error: "Không đọc được nội dung. Vui lòng thử lại với ảnh rõ hơn." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return { error: "AI trả về dữ liệu không hợp lệ. Vui lòng thử lại." };
  }

  if (!Array.isArray(parsed)) {
    return { error: "AI không tìm thấy khoản thu/chi nào rõ ràng. Vui lòng thử lại." };
  }

  const entries: DraftEntry[] = parsed
    .filter(
      (e): e is { type: string; amount: number; note?: string; date?: string | null } =>
        e && typeof e.amount === "number" && DRAFT_TYPES.includes(e.type)
    )
    .map((e) => ({
      type: e.type as DraftEntryType,
      amount: Math.round(e.amount),
      note: e.note || "",
      // Chỉ chấp nhận đúng định dạng YYYY-MM-DD — phòng trường hợp AI lỡ trả sai định dạng
      // (vd "9/8") dù đã dặn trong prompt, tránh hiểu nhầm ngày/tháng khi lưu vào database.
      date: e.date && /^\d{4}-\d{2}-\d{2}$/.test(e.date) ? e.date : null,
    }));

  if (entries.length === 0) {
    return { error: "Không tìm thấy khoản thu/chi nào rõ ràng trong nội dung này. Vui lòng thử lại." };
  }

  return { entries };
}
