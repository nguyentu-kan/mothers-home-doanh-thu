export default function CustomDateRangeForm({ from, to }: { from?: string; to?: string }) {
  return (
    <form method="get" className="flex items-end gap-2">
      <input type="hidden" name="period" value="custom" />
      <div className="flex-1">
        <label className="field-label" htmlFor="from">
          Từ ngày
        </label>
        <input id="from" name="from" type="date" defaultValue={from} className="field-input" required />
      </div>
      <div className="flex-1">
        <label className="field-label" htmlFor="to">
          Đến ngày
        </label>
        <input id="to" name="to" type="date" defaultValue={to} className="field-input" required />
      </div>
      <button type="submit" className="rounded-xl px-4 py-3 font-semibold bg-[#1B3A5C] text-white">
        Xem
      </button>
    </form>
  );
}
