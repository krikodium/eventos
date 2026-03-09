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

const COLORS = {
  ingresos: "#0ea5e9",
  pagos: "#f43f5e",
  utileros: "#fb923c",
  cajaChica: "#64748b",
};

export function DashboardCharts({ ingresos, pagos, utileros, cajaChica }: Props) {
  const data = [
    {
      name: "Ingresos",
      value: ingresos,
      fill: COLORS.ingresos,
    },
    {
      name: "Pagos proveedores",
      value: pagos,
      fill: COLORS.pagos,
    },
    {
      name: "Utileros",
      value: utileros,
      fill: COLORS.utileros,
    },
    {
      name: "Caja chica",
      value: cajaChica,
      fill: COLORS.cajaChica,
    },
  ].filter((d) => d.value > 0);

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500 text-sm">
        Sin datos para mostrar
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 80 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis type="number" tickFormatter={(v) => `$${v.toLocaleString("es-AR")}`} />
          <YAxis type="category" dataKey="name" width={75} tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value: number | undefined) => [`$${(value ?? 0).toLocaleString("es-AR")}`, ""]}
            contentStyle={{ fontSize: 12 }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
