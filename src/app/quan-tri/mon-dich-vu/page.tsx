import { prisma } from "@/lib/prisma";
import Header from "@/components/Header";
import { updateMenuItemAction } from "./actions";
import CreateMenuItemForm from "./CreateMenuItemForm";

export default async function MonDichVuPage() {
  const items = await prisma.menuItem.findMany({ orderBy: [{ category: "asc" }, { sortOrder: "asc" }] });

  return (
    <>
      <Header />
      <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full flex flex-col gap-4">
        <h1 className="text-xl font-extrabold text-[#1B3A5C] dark:text-white">Món &amp; Dịch vụ</h1>

        <div className="card">
          <div className="font-bold mb-3">Thêm món mới</div>
          <CreateMenuItemForm />
        </div>

        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <form key={item.id} action={updateMenuItemAction} className="card flex flex-col gap-3">
              <input type="hidden" name="id" value={item.id} />
              <div className="text-sm text-slate-500">{item.category === "CA_PHE" ? "☕ Cà phê/Nước" : "💆 Spa"}</div>
              <div>
                <label className="field-label">Tên món</label>
                <input name="name" defaultValue={item.name} className="field-input" />
              </div>
              <div>
                <label className="field-label">Giá</label>
                <input name="price" type="number" min={0} defaultValue={item.price} className="field-input" />
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="active" defaultChecked={item.active} className="w-5 h-5" />
                Đang sử dụng (bỏ tick để ẩn khỏi Ghi nhận dịch vụ)
              </label>
              <button type="submit" className="rounded-xl py-3 font-semibold bg-[#1B3A5C] text-white">
                Lưu
              </button>
            </form>
          ))}
        </div>
      </main>
    </>
  );
}
