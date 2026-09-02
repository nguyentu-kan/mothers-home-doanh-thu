import { prisma } from "@/lib/prisma";
import Header from "@/components/Header";
import { updateSettingsAction } from "./actions";

export default async function CaiDatPage() {
  const settings = await prisma.appSetting.findMany();
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  return (
    <>
      <Header />
      <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full flex flex-col gap-4">
        <h1 className="text-xl font-extrabold text-[#1B3A5C] dark:text-white">Cài đặt</h1>

        <form action={updateSettingsAction} className="card flex flex-col gap-4">
          <div>
            <label className="field-label">Ngưỡng cảnh báo vàng (Cân nhắc nộp bớt)</label>
            <input
              name="cash_warning_threshold"
              type="number"
              defaultValue={map.cash_warning_threshold || "3000000"}
              className="field-input"
            />
          </div>
          <div>
            <label className="field-label">Ngưỡng cảnh báo đỏ (Bắt buộc nộp)</label>
            <input
              name="cash_danger_threshold"
              type="number"
              defaultValue={map.cash_danger_threshold || "5000000"}
              className="field-input"
            />
          </div>
          <div>
            <label className="field-label">Email Quản lý nhận cảnh báo</label>
            <input
              name="manager_alert_email"
              type="email"
              defaultValue={map.manager_alert_email || ""}
              className="field-input"
              placeholder="thay-thanh@gmail.com"
            />
          </div>
          {!map.genesis_date && (
            <div>
              <label className="field-label">Tiền mặt tại quầy hiện có (nhập 1 lần khi bắt đầu dùng app)</label>
              <input name="initial_cash" type="number" defaultValue={map.initial_cash || "0"} className="field-input" />
            </div>
          )}
          <button type="submit" className="btn-big bg-[#1B3A5C]">
            Lưu cài đặt
          </button>
        </form>
      </main>
    </>
  );
}
