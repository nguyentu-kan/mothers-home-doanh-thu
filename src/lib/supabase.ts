import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET || "chung-tu";

export function getSupabaseAdmin() {
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey);
}

// Upload 1 file chứng từ (ảnh/PDF) lên Supabase Storage, trả về URL public.
// Trả về null nếu Supabase chưa được cấu hình (cho phép app chạy được mà chưa cần upload), file rỗng, hoặc lỗi upload.
async function uploadOneAttachment(file: File): Promise<string | null> {
  if (file.size === 0) return null;
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const ext = file.name.split(".").pop() || "bin";
  const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error } = await supabase.storage.from(bucket).upload(path, arrayBuffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) {
    console.error("Lỗi upload chứng từ:", error.message);
    return null;
  }
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// Upload nhiều file chứng từ cùng lúc, trả về danh sách URL của những file upload thành công
// (file lỗi bị bỏ qua thay vì chặn cả việc lưu khoản thu/chi).
export async function uploadAttachments(files: File[]): Promise<string[]> {
  const urls = await Promise.all(files.map(uploadOneAttachment));
  return urls.filter((url): url is string => url !== null);
}
