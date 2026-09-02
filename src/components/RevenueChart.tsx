"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import type { DailyRevenuePoint } from "@/lib/summary";

const COLORS = { Phòng: "#1B3A5C", "Cà phê": "#B45309", Spa: "#0E7C66", OTA: "#7C3AED" };

export default function RevenueChart({ data }: { data: DailyRevenuePoint[] }) {
  return (
    <div className="w-full" style={{ height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" fontSize={11} />
          <YAxis fontSize={11} width={40} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
          <Tooltip formatter={(v) => Number(v).toLocaleString("vi-VN") + "đ"} />
          <Legend />
          {Object.entries(COLORS).map(([key, color]) => (
            <Bar key={key} dataKey={key} stackId="a" fill={color} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
