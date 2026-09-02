"use client";

import { useActionState } from "react";
import { createMenuItemAction, type MenuItemFormState } from "./actions";

export default function CreateMenuItemForm() {
  const [state, action, pending] = useActionState<MenuItemFormState, FormData>(createMenuItemAction, undefined);

  return (
    <form action={action} className="flex flex-col gap-3">
      <div>
        <label className="field-label">Loại</label>
        <select name="category" defaultValue="CA_PHE" className="field-input">
          <option value="CA_PHE">☕ Cà phê/Nước</option>
          <option value="SPA">💆 Spa</option>
        </select>
      </div>
      <div>
        <label className="field-label">Tên món</label>
        <input name="name" required className="field-input" placeholder="Vd: Cà phê sữa đá" />
      </div>
      <div>
        <label className="field-label">Giá</label>
        <input name="price" type="number" min={0} required className="field-input" />
      </div>

      {state?.error && <p className="rounded-xl bg-red-100 px-4 py-3 text-red-800 font-semibold">{state.error}</p>}

      <button type="submit" disabled={pending} className="rounded-xl py-3 font-semibold bg-emerald-600 text-white">
        {pending ? "Đang thêm..." : "Thêm món"}
      </button>
    </form>
  );
}
