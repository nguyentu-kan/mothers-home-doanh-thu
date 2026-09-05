import Header from "@/components/Header";
import { prisma } from "@/lib/prisma";
import KhoAnhClient from "./KhoAnhClient";

export default async function KhoAnhPage() {
  const [attachments, transfers] = await Promise.all([
    prisma.unassignedAttachment.findMany({
      orderBy: { time: "desc" },
      include: { recordedByUser: { select: { name: true } } },
    }),
    prisma.ownerTransfer.findMany({
      orderBy: { time: "desc" },
      take: 30,
      include: { recordedByUser: { select: { name: true } } },
    }),
  ]);

  return (
    <>
      <Header />
      <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full flex flex-col gap-4">
        <h1 className="text-xl font-extrabold text-[#1B3A5C] dark:text-white">📎 Kho ảnh chứng từ</h1>
        <p className="text-sm text-slate-500">
          Up ảnh chuyển khoản ngay — AI tự đọc thử ngày và số tiền trên ảnh, không cần điền tay. Rảnh lúc nào thì gắn
          ảnh vào đúng khoản đã ghi, hoặc tạo khoản mới từ ảnh đó. Ảnh chưa gắn vẫn được lưu ở đây, không mất.
        </p>

        <KhoAnhClient
          attachments={attachments.map((a) => ({
            id: a.id,
            url: a.url,
            note: a.note,
            time: a.time,
            suggestedAmount: a.suggestedAmount,
            recordedByName: a.recordedByUser.name,
          }))}
          transfers={transfers.map((t) => ({
            id: t.id,
            time: t.time,
            amount: t.amount,
            method: t.method,
            note: t.note,
            attachmentCount: t.attachmentUrls.length,
          }))}
        />
      </main>
    </>
  );
}
