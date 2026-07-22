"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

type Props = {
  ingresos: number;
  pagos: number;
  utileros: number;
  cajaChica: number;
};

const FILLS = ["#171717", "#525252", "#a3a3a3", "#d4d4d4"];

export function DashboardCharts({ ingresos, pagos, utileros, cajaChica }: Props) {
  const data = [
    { name: "Ingresos", value: ingresos },
    { name: "Proveedores", value: pagos },
    { name: "Utileros", value: utileros },
    { name: "Caja chica", value: cajaChica },
  ].filter((d) => d.value > 0);

  if (data.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center text-neutral-400 text-sm">
        Sin datos para mostrar
      </div>
    );
  }

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={(v) => `$${v.toLocaleString("es-AR")}`}
            tick={{ fontSize: 11, fill: "#a3a3a3" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={80}
            tick={{ fontSize: 11, fill: "#737373" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value: number | undefined) => [`$${(value ?? 0).toLocaleString("es-AR")}`, ""]}
            contentStyle={{
              fontSize: 12,
              background: "#fff",
              border: "1px solid #e5e5e5",
              borderRadius: 6,
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}
            cursor={{ fill: "rgba(0,0,0,0.02)" }}
          />
          <Bar dataKey="value" radius={[0, 3, 3, 0]} barSize={20}>
            {data.map((_, i) => (
              <Cell key={i} fill={FILLS[i % FILLS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
