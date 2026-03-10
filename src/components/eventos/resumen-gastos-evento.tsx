"use client";

import { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

type Movimiento = {
  proveedor: string;
  rubro: string;
  monto: number;
};

type Props = {
  pagos: Array<{
    monto: number;
    concepto: string | null;
    proveedor: { nombre: string };
    rubro: { nombre: string };
  }>;
  diasUtileros: Array<{
    monto: number;
    tipo?: string;
    utilero: { nombre: string };
  }>;
  cajaChica: Array<{
    monto: number;
    empleadaEncargada: string;
    concepto: string | null;
  }>;
};

const TIPOS_DIA: Record<string, string> = {
  ARMADO: "Armado",
  GUARDIA: "Guardia",
  EVENTO: "Día evento",
  DESARME_EVENTO: "Desarme evento",
  DESARME_DEPO: "Desarme depósito",
};

const COLORS = [
  "#0ea5e9",
  "#f43f5e",
  "#22c55e",
  "#eab308",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

export function ResumenGastosEvento({ pagos, diasUtileros, cajaChica }: Props) {
  const movimientos: Movimiento[] = [];

  for (const p of pagos) {
    movimientos.push({
      proveedor: p.proveedor.nombre,
      rubro: p.rubro.nombre,
      monto: p.monto,
    });
  }

  for (const d of diasUtileros) {
    movimientos.push({
      proveedor: d.utilero.nombre,
      rubro: TIPOS_DIA[d.tipo ?? "EVENTO"] ?? d.tipo ?? "Utileros",
      monto: d.monto,
    });
  }

  for (const c of cajaChica) {
    movimientos.push({
      proveedor: c.empleadaEncargada,
      rubro: c.concepto ?? "Caja chica",
      monto: c.monto,
    });
  }

  if (movimientos.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">
          Resumen de gastos
        </h2>
        <p className="text-slate-500 text-sm">
          No hay movimientos registrados para este evento
        </p>
      </div>
    );
  }

  const totalEgresos = movimientos.reduce((s, m) => s + m.monto, 0);

  const porRubro = new Map<string, number>();
  for (const m of movimientos) {
    porRubro.set(m.rubro, (porRubro.get(m.rubro) ?? 0) + m.monto);
  }

  const porProveedor = new Map<string, number>();
  for (const m of movimientos) {
    porProveedor.set(m.proveedor, (porProveedor.get(m.proveedor) ?? 0) + m.monto);
  }

  const dataPie = Array.from(porRubro.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const rubrosOrdenados = Array.from(porRubro.entries()).sort((a, b) => b[1] - a[1]);
  const proveedoresOrdenados = Array.from(porProveedor.entries()).sort((a, b) => b[1] - a[1]);
  const movimientosOrdenados = [...movimientos].sort((a, b) => b.monto - a.monto);

  const dataBarProveedores = proveedoresOrdenados.map(([name, value], i) => ({
    name,
    value,
    fill: COLORS[i % COLORS.length],
  }));

  const [modalAbierto, setModalAbierto] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalAbierto(false);
    };
    if (modalAbierto) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [modalAbierto]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-700 bg-slate-800">
        <h2 className="text-lg font-semibold text-white">
          Resumen de gastos por rubro y proveedor
        </h2>
        <p className="text-slate-300 text-sm mt-0.5">
          Desglose de egresos por categoría y proveedor
        </p>
      </div>

      <div className="p-6">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Gráfico - columna principal */}
          <div className="lg:col-span-2">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">
              Distribución por rubro
            </h3>
            <div className="relative">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dataPie}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={40}
                      paddingAngle={2}
                      label={({ name, percent }) =>
                        percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ""
                      }
                      labelLine={false}
                    >
                      {dataPie.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} stroke={COLORS[i % COLORS.length]} strokeWidth={1} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const { name, value } = payload[0].payload;
                        return (
                          <div className="bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-md text-sm">
                            <p className="font-medium text-slate-700">Rubro: {name}</p>
                            <p className="text-slate-900 font-semibold tabular-nums">
                              Gasto total: ${value.toLocaleString("es-AR")}
                            </p>
                          </div>
                        );
                      }}
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 8,
                        border: "1px solid #e2e8f0",
                      }}
                    />
                    <Legend
                      layout="vertical"
                      align="right"
                      verticalAlign="middle"
                      wrapperStyle={{ paddingLeft: 24 }}
                      iconSize={10}
                      iconType="square"
                      itemGap={8}
                      formatter={(value) => <span className="text-slate-600 text-sm">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <button
                type="button"
                onClick={() => setModalAbierto(true)}
                className="absolute left-0 bottom-0 w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 border border-slate-200/80 hover:border-slate-300 transition-colors duration-150"
                title="Ver gráfico detallado"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-5 h-5 shrink-0">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Resúmenes por rubro y proveedor */}
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                Por rubro
              </h3>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {rubrosOrdenados.map(([rubro, monto]) => {
                  const pct = totalEgresos > 0 ? ((monto / totalEgresos) * 100).toFixed(1) : "0";
                  return (
                    <div
                      key={rubro}
                      className="flex justify-between items-center py-2 px-3 rounded-lg bg-slate-50 hover:bg-slate-100/80 transition-colors"
                    >
                      <span className="text-slate-700 text-sm font-medium">{rubro}</span>
                      <div className="text-right">
                        <span className="font-semibold text-slate-900 text-sm tabular-nums">
                          ${monto.toLocaleString("es-AR")}
                        </span>
                        <span className="text-slate-400 text-xs ml-1.5">({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                Por proveedor
              </h3>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {proveedoresOrdenados.map(([proveedor, monto]) => {
                  const pct = totalEgresos > 0 ? ((monto / totalEgresos) * 100).toFixed(1) : "0";
                  return (
                    <div
                      key={proveedor}
                      className="flex justify-between items-center py-2 px-3 rounded-lg bg-slate-50 hover:bg-slate-100/80 transition-colors"
                    >
                      <span className="text-slate-700 text-sm font-medium truncate max-w-[120px]">
                        {proveedor}
                      </span>
                      <div className="text-right shrink-0">
                        <span className="font-semibold text-slate-900 text-sm tabular-nums">
                          ${monto.toLocaleString("es-AR")}
                        </span>
                        <span className="text-slate-400 text-xs ml-1.5">({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Tabla detallada */}
        <div className="mt-8 pt-6 border-t border-slate-200">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">
            Detalle de movimientos
          </h3>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  <th className="px-4 py-3">Proveedor</th>
                  <th className="px-4 py-3">Rubro</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movimientosOrdenados.map((m, i) => (
                  <tr
                    key={i}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">{m.proveedor}</td>
                    <td className="px-4 py-3 text-slate-600">{m.rubro}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900 tabular-nums">
                      ${m.monto.toLocaleString("es-AR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end">
            <div className="px-4 py-2 bg-slate-100 rounded-lg">
              <span className="text-sm font-semibold text-slate-700">
                Total egresos:{" "}
              </span>
              <span className="text-slate-900 font-bold tabular-nums">
                ${totalEgresos.toLocaleString("es-AR")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal gráfico detallado */}
      {modalAbierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setModalAbierto(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 px-6 py-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                Gráfico detallado de gastos
              </h3>
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-slate-600 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-8">
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">
                  Distribución por rubro
                </h4>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dataPie}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={120}
                        innerRadius={50}
                        paddingAngle={2}
                        label={({ name, percent }) =>
                          percent > 0.03 ? `${name} ${(percent * 100).toFixed(0)}%` : ""
                        }
                        labelLine={false}
                      >
                        {dataPie.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} stroke={COLORS[i % COLORS.length]} strokeWidth={1} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const { name, value } = payload[0].payload;
                          return (
                            <div className="bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-md text-sm">
                              <p className="font-medium text-slate-700">Rubro: {name}</p>
                              <p className="text-slate-900 font-semibold tabular-nums">
                                Gasto total: ${value.toLocaleString("es-AR")}
                              </p>
                            </div>
                          );
                        }}
                      />
                      <Legend
                        layout="vertical"
                        align="right"
                        verticalAlign="middle"
                        wrapperStyle={{ paddingLeft: 24 }}
                        iconSize={10}
                        iconType="square"
                        itemGap={8}
                        formatter={(value, entry) => {
                          const monto = entry?.payload?.value ?? 0;
                          return (
                            <span className="text-slate-600 text-sm">
                              {value}{" "}
                              <span className="font-semibold text-slate-900 tabular-nums">
                                ${monto.toLocaleString("es-AR")}
                              </span>
                            </span>
                          );
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">
                  Desglose por proveedor
                </h4>
                <div className="h-80 min-h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={dataBarProveedores}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 100 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis
                        type="number"
                        tickFormatter={(v) => `$${v.toLocaleString("es-AR")}`}
                      />
                      <YAxis type="category" dataKey="name" width={95} tick={{ fontSize: 11 }} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const { name, value } = payload[0].payload;
                          return (
                            <div className="bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-md text-sm">
                              <p className="font-medium text-slate-700">Proveedor: {name}</p>
                              <p className="text-slate-900 font-semibold tabular-nums">
                                Gasto total: ${value.toLocaleString("es-AR")}
                              </p>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {dataBarProveedores.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
