"use client";

import { useActionState, useState } from "react";
import { createServiceRecordAction, type ServiceFormState } from "./actions";

type MenuItem = { id: string; category: "CA_PHE" | "SPA"; name: string; price: number };

const PAYMENT_OPTIONS: { value: "GHI_PHONG" | "TIEN_MAT" | "CHUYEN_KHOAN"; label: string }[] = [
  { value: "GHI_PHONG", label: "Ghi phòng" },
  { value: "TIEN_MAT", label: "Tiền mặt" },
  { value: "CHUYEN_KHOAN", label: "Chuyển khoản" },
];

export default function ServiceForm({ menuItems }: { menuItems: MenuItem[] }) {
  const [state, action, pending] = useActionState<ServiceFormState, FormData>(
    createServiceRecordAction,
    undefined
  );

  const [category, setCategory] = useState<"CA_PHE" | "SPA" | null>(null);
  const [menuItemId, setMenuItemId] = useState<string>("");
  const [content, setContent] = useState("");
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [amount, setAmount] = useState<number>(0);
  const [roomOrGuest, setRoomOrGuest] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"GHI_PHONG" | "TIEN_MAT" | "CHUYEN_KHOAN" | "">("");

  // Reset form để ghi lượt tiếp theo ngay khi action vừa lưu thành công — điều chỉnh state
  // trực tiếp trong lúc render (theo pattern "Adjusting state" của React) thay vì dùng effect,
  // giữ lại loại dịch vụ + hình thức thanh toán vì thường ghi liên tiếp cùng loại.
  const [lastHandledState, setLastHandledState] = useState(state);
  if (state !== lastHandledState) {
    setLastHandledState(state);
    if (state?.ok) {
      setMenuItemId("");
      setContent("");
      setUnitPrice(0);
      setQuantity(1);
      setAmount(0);
      setRoomOrGuest("");
    }
  }

  function pickMenuItem(item: MenuItem) {
    setMenuItemId(item.id);
    setContent(item.name);
    setUnitPrice(item.price);
    setAmount(item.price * quantity);
  }

  function onQuantityChange(value: string) {
    const nextQuantity = value === "" ? 0 : parseInt(value, 10);
    setQuantity(nextQuantity);
    setAmount(nextQuantity * unitPrice);
  }

  function onUnitPriceChange(value: string) {
    const nextUnitPrice = value === "" ? 0 : parseInt(value, 10);
    setUnitPrice(nextUnitPrice);
    setAmount(quantity * nextUnitPrice);
  }

  const itemsForCategory = menuItems.filter((m) => m.category === category);

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="category" value={category ?? ""} />
      <input type="hidden" name="menuItemId" value={menuItemId} />

      <div>
        <label className="field-label">Loại dịch vụ</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              setCategory("CA_PHE");
              setMenuItemId("");
              setContent("");
              setUnitPrice(0);
            }}
            className={`btn-big ${category === "CA_PHE" ? "bg-[#1B3A5C]" : "bg-slate-400"}`}
          >
            ☕ Cà phê/Nước
          </button>
          <button
            type="button"
            onClick={() => {
              setCategory("SPA");
              setMenuItemId("");
              setContent("");
              setUnitPrice(0);
            }}
            className={`btn-big ${category === "SPA" ? "bg-[#1B3A5C]" : "bg-slate-400"}`}
          >
            💆 Spa
          </button>
        </div>
      </div>

      {category && (
        <div>
          <label className="field-label">Chọn nhanh</label>
          <div className="flex flex-wrap gap-2">
            {itemsForCategory.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => pickMenuItem(item)}
                className={`rounded-xl px-3 py-2 text-sm font-semibold border ${
                  menuItemId === item.id
                    ? "bg-[#1B3A5C] text-white border-[#1B3A5C]"
                    : "bg-white border-black/15 dark:bg-white/5 dark:border-white/20"
                }`}
              >
                {item.name} · {item.price.toLocaleString("vi-VN")}đ
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="field-label" htmlFor="content">
          Nội dung
        </label>
        <input
          id="content"
          name="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Vd: Cà phê sữa đá, Massage 60 phút"
          className="field-input"
          required
        />
      </div>

      <div>
        <label className="field-label" htmlFor="roomOrGuest">
          Số phòng / Tên khách
        </label>
        <div className="flex gap-2">
          <input
            id="roomOrGuest"
            name="roomOrGuest"
            value={roomOrGuest}
            onChange={(e) => setRoomOrGuest(e.target.value)}
            placeholder="Vd: 301"
            className="field-input flex-1"
            required
          />
          <button
            type="button"
            onClick={() => setRoomOrGuest("Khách ngoài")}
            className="rounded-xl px-4 font-semibold bg-slate-200 dark:bg-white/10"
          >
            Khách ngoài
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label" htmlFor="quantity">
            Số lượng
          </label>
          <input
            id="quantity"
            name="quantity"
            type="number"
            min={1}
            value={quantity === 0 ? "" : quantity}
            onChange={(e) => onQuantityChange(e.target.value)}
            className="field-input"
          />
        </div>
        <div>
          <label className="field-label" htmlFor="unitPrice">
            Đơn giá
          </label>
          <input
            id="unitPrice"
            name="unitPrice"
            type="number"
            min={0}
            value={unitPrice === 0 ? "" : unitPrice}
            onChange={(e) => onUnitPriceChange(e.target.value)}
            className="field-input"
          />
        </div>
      </div>

      <div>
        <label className="field-label" htmlFor="amount">
          Thành tiền
        </label>
        <input
          id="amount"
          name="amount"
          type="number"
          min={0}
          value={amount === 0 ? "" : amount}
          onChange={(e) => setAmount(e.target.value === "" ? 0 : parseInt(e.target.value, 10))}
          className="field-input font-bold text-xl"
        />
      </div>

      <div>
        <label className="field-label">Hình thức</label>
        <div className="grid grid-cols-3 gap-2">
          {PAYMENT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPaymentMethod(opt.value)}
              className={`rounded-xl py-3 font-semibold text-sm ${
                paymentMethod === opt.value ? "bg-[#1B3A5C] text-white" : "bg-slate-200 dark:bg-white/10"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <input type="hidden" name="paymentMethod" value={paymentMethod} />
      </div>

      {state && !state.ok && <p className="rounded-xl bg-red-100 px-4 py-3 text-red-800 font-semibold">{state.error}</p>}
      {state?.ok && <p className="rounded-xl bg-green-100 px-4 py-3 text-green-800 font-semibold">{state.message}</p>}

      <button type="submit" disabled={pending || !category} className="btn-big bg-emerald-600">
        {pending ? "Đang lưu..." : "Lưu"}
      </button>
    </form>
  );
}
