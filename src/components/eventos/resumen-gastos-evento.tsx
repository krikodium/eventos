"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { cajaSentidoEsEgreso } from "@/lib/caja-chica-pesos";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
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
    sentido?: string | null;
    empleadaEncargada: string;
    concepto: string | null;
  }>;
};

const TIPOS_DIA: Record<string, string> = {
  ARMADO: "Armado",
  ARMADO_1: "Armado 1",
  ARMADO_2: "Armado 2",
  GUARDIA: "Guardia",
  EVENTO: "Día evento",
  DESARME_EVENTO: "Desarme evento",
  DESARME_DEPO: "Desarme depósito",
};

const COLORS = [
  "#3f3f3d",
  "#f43f5e",
  "#22c55e",
  "#eab308",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

export function ResumenGastosEvento({ pagos, diasUtileros, cajaChica }: Props) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  function abrirModal() {
    setModalAbierto(true);
    requestAnimationFrame(() => setModalVisible(true));
  }
  function cerrarModal() {
    setModalVisible(false);
    setModalAbierto(false);
  }

  useEffect(() => {
    if (!modalAbierto) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModalVisible(false);
        setModalAbierto(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [modalAbierto]);

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
    if (!cajaSentidoEsEgreso(c.sentido)) continue;
    movimientos.push({
      proveedor: c.empleadaEncargada,
      rubro: c.concepto ?? "Caja chica",
      monto: c.monto,
    });
  }

  if (movimientos.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-8">
        <h2 className="text-lg font-semibold text-neutral-900 mb-2">
          Resumen de gastos
        </h2>
        <p className="text-neutral-500 text-sm">
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

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="border-b border-neutral-100 px-6 py-4">
        <h2 className="text-lg font-semibold tracking-tight text-neutral-900">
          Resumen de gastos por rubro y proveedor
        </h2>
        <p className="mt-0.5 text-sm text-neutral-500">
          Desglose de egresos por categoría y proveedor
        </p>
      </div>

      <div className="p-6">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Gráfico - columna principal */}
          <div className="lg:col-span-2">
            <h3 className="mb-4 text-sm font-semibold text-neutral-700">
              Distribución por rubro
            </h3>
            <div className="relative rounded-2xl border border-neutral-200 bg-neutral-50/60 p-4 ring-1 ring-inset ring-white/70">
              <div className="relative h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dataPie}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={104}
                      innerRadius={64}
                      paddingAngle={3}
                      cornerRadius={6}
                      label={({ name, percent }) =>
                        (percent ?? 0) > 0.06 ? `${name} ${((percent ?? 0) * 100).toFixed(0)}%` : ""
                      }
                      labelLine={false}
                    >
                      {dataPie.map((_, i) => (
                        <Cell
                          key={i}
                          fill={COLORS[i % COLORS.length]}
                          fillOpacity={0.72}
                          stroke="#ffffff"
                          strokeWidth={2.5}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const { name, value } = payload[0].payload;
                        return (
                          <div className="rounded-xl border border-white/60 bg-white/90 px-3 py-2 text-sm shadow-lg backdrop-blur-md">
                            <p className="font-medium text-neutral-700">Rubro: {name}</p>
                            <p className="font-semibold tabular-nums text-neutral-900">
                              Gasto total: ${value.toLocaleString("es-AR")}
                            </p>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Total en el centro del donut */}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Total egresos</span>
                  <span className="text-xl font-bold tabular-nums text-neutral-900">
                    ${totalEgresos.toLocaleString("es-AR")}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={abrirModal}
                className="absolute bottom-3 left-3 flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 shadow-sm transition-colors hover:bg-neutral-50 hover:text-neutral-700"
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
              <h3 className="mb-3 text-sm font-semibold text-neutral-700">Por rubro</h3>
              <div className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
                {rubrosOrdenados.map(([rubro, monto], i) => {
                  const pct = totalEgresos > 0 ? ((monto / totalEgresos) * 100).toFixed(1) : "0";
                  return (
                    <div
                      key={rubro}
                      className="flex items-center justify-between gap-3 rounded-lg bg-neutral-50 px-3 py-2 transition-colors hover:bg-neutral-100/80"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="truncate text-sm font-medium text-neutral-700">{rubro}</span>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="text-sm font-semibold tabular-nums text-neutral-900">${monto.toLocaleString("es-AR")}</span>
                        <span className="ml-1.5 text-xs text-neutral-400">({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold text-neutral-700">Por proveedor</h3>
              <div className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
                {proveedoresOrdenados.map(([proveedor, monto]) => {
                  const pct = totalEgresos > 0 ? ((monto / totalEgresos) * 100).toFixed(1) : "0";
                  return (
                    <div
                      key={proveedor}
                      className="flex items-center justify-between gap-3 rounded-lg bg-neutral-50 px-3 py-2 transition-colors hover:bg-neutral-100/80"
                    >
                      <span className="truncate text-sm font-medium text-neutral-700">{proveedor}</span>
                      <div className="shrink-0 text-right">
                        <span className="text-sm font-semibold tabular-nums text-neutral-900">${monto.toLocaleString("es-AR")}</span>
                        <span className="ml-1.5 text-xs text-neutral-400">({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Tabla detallada */}
        <div className="mt-8 border-t border-neutral-100 pt-6">
          <h3 className="mb-4 text-sm font-semibold text-neutral-700">
            Detalle de movimientos
          </h3>
          <div className="overflow-x-auto rounded-xl border border-neutral-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  <th className="px-4 py-3">Proveedor</th>
                  <th className="px-4 py-3">Rubro</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {movimientosOrdenados.map((m, i) => (
                  <tr key={i} className="transition-colors hover:bg-neutral-50/60">
                    <td className="px-4 py-3 font-medium text-neutral-800">{m.proveedor}</td>
                    <td className="px-4 py-3 text-neutral-600">{m.rubro}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-neutral-900">
                      ${m.monto.toLocaleString("es-AR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end">
            <div className="rounded-lg bg-neutral-100 px-4 py-2">
              <span className="text-sm font-semibold text-neutral-700">Total egresos: </span>
              <span className="font-bold tabular-nums text-neutral-900">
                ${totalEgresos.toLocaleString("es-AR")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal gráfico detallado (portal a body para evitar recorte por ancestros) */}
      {modalAbierto && typeof document !== "undefined" &&
        createPortal(
          <div
            className={`fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm transition-opacity duration-200 ${
              modalVisible ? "opacity-100" : "opacity-0"
            }`}
            onClick={cerrarModal}
          >
            <div
              className={`flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl transition-all duration-200 ${
                modalVisible ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-95 opacity-0"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-6 py-4">
                <h3 className="text-lg font-semibold text-neutral-900">Gráfico detallado de gastos</h3>
                <button
                  type="button"
                  onClick={cerrarModal}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-neutral-900"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-8 overflow-y-auto p-6">
                <div>
                  <h4 className="mb-4 text-sm font-semibold text-neutral-700">Distribución por rubro</h4>
                  <div className="grid gap-6 md:grid-cols-[1.15fr_1fr] md:items-center">
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={dataPie}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={110}
                            innerRadius={48}
                            paddingAngle={2}
                            label={({ name, percent }) =>
                              (percent ?? 0) > 0.05 ? `${name} ${((percent ?? 0) * 100).toFixed(0)}%` : ""
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
                                <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm shadow-md">
                                  <p className="font-medium text-neutral-700">Rubro: {name}</p>
                                  <p className="font-semibold tabular-nums text-neutral-900">
                                    Gasto total: ${value.toLocaleString("es-AR")}
                                  </p>
                                </div>
                              );
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Leyenda de categorías propia (evita el desacomodo del Legend de recharts) */}
                    <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
                      {dataPie.map((d, i) => {
                        const pct = totalEgresos > 0 ? ((d.value / totalEgresos) * 100).toFixed(1) : "0";
                        return (
                          <div key={d.name} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-neutral-50">
                            <div className="flex min-w-0 items-center gap-2.5">
                              <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                              <span className="truncate text-sm text-neutral-700">{d.name}</span>
                            </div>
                            <div className="shrink-0 text-right">
                              <span className="text-sm font-semibold tabular-nums text-neutral-900">${d.value.toLocaleString("es-AR")}</span>
                              <span className="ml-1.5 text-xs text-neutral-400">({pct}%)</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="mb-3 text-sm font-semibold text-neutral-700">Desglose por proveedor</h4>
                  <div className="h-80 min-h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dataBarProveedores} layout="vertical" margin={{ top: 5, right: 30, left: 100 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis type="number" tickFormatter={(v) => `$${v.toLocaleString("es-AR")}`} />
                        <YAxis type="category" dataKey="name" width={95} tick={{ fontSize: 11 }} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const { name, value } = payload[0].payload;
                            return (
                              <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm shadow-md">
                                <p className="font-medium text-neutral-700">Proveedor: {name}</p>
                                <p className="font-semibold tabular-nums text-neutral-900">
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
          </div>,
          document.body
        )}
    </div>
  );
}
