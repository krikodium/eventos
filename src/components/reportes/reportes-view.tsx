"use client";

import { useState } from "react";

type ReporteData = {
  desde: string;
  hasta: string;
  porRubro: Array<{ rubro: string; total: number; cantidad: number }>;
  porProveedor: Array<{ proveedor: string; total: number; cantidad: number }>;
  totales: {
    pagosProveedores: number;
    utileros: number;
    cajaChica?: number;
    ingresos: number;
    egresos: number;
    balance: number;
  };
};

export function ReportesView() {
  const now = new Date();
  const [desde, setDesde] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  );
  const [hasta, setHasta] = useState(now.toISOString().slice(0, 10));
  const [data, setData] = useState<ReporteData | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function cargar() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/reportes?desde=${desde}&hasta=${hasta}`
      );
      if (!res.ok) throw new Error("Error");
      const json = await res.json();
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  async function exportarExcel() {
    if (!data) return;
    setExporting(true);
    try {
      const XLSX = (await import("xlsx")).default;
      const wsRubros = XLSX.utils.json_to_sheet(
        data.porRubro.map((r) => ({ Rubro: r.rubro, Total: r.total, Cantidad: r.cantidad }))
      );
      const wsProveedores = XLSX.utils.json_to_sheet(
        data.porProveedor.map((p) => ({
          Proveedor: p.proveedor,
          Total: p.total,
          Cantidad: p.cantidad,
        }))
      );
      const wsTotales = XLSX.utils.json_to_sheet([
        { Concepto: "Ingresos", Monto: data.totales.ingresos },
        { Concepto: "Pagos proveedores", Monto: data.totales.pagosProveedores },
        { Concepto: "Utileros", Monto: data.totales.utileros },
        { Concepto: "Caja chica", Monto: data.totales.cajaChica ?? 0 },
        { Concepto: "Egresos totales", Monto: data.totales.egresos },
        { Concepto: "Balance", Monto: data.totales.balance },
      ]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsTotales, "Totales");
      XLSX.utils.book_append_sheet(wb, wsRubros, "Por rubro");
      XLSX.utils.book_append_sheet(wb, wsProveedores, "Por proveedor");
      XLSX.writeFile(
        wb,
        `reporte-${desde}-${hasta}.xlsx`
      );
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  }

  function exportarCSV() {
    if (!data) return;
    const lines = [
      "Rubro,Total,Cantidad",
      ...data.porRubro.map((r) => `${r.rubro},${r.total},${r.cantidad}`),
      "",
      "Proveedor,Total,Cantidad",
      ...data.porProveedor.map((p) => `${p.proveedor},${p.total},${p.cantidad}`),
      "",
      "Concepto,Monto",
      `Ingresos,${data.totales.ingresos}`,
      `Pagos proveedores,${data.totales.pagosProveedores}`,
      `Utileros,${data.totales.utileros}`,
      `Caja chica,${data.totales.cajaChica ?? 0}`,
      `Balance,${data.totales.balance}`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte-${desde}-${hasta}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700 bg-slate-800">
          <h2 className="font-semibold text-white text-sm uppercase tracking-wider">
            Filtros por período
          </h2>
          <p className="text-slate-300 text-xs mt-0.5">Selecciona el rango de fechas</p>
        </div>
        <div className="p-6 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs text-slate-500 font-medium mb-1">Desde</label>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 font-medium mb-1">Hasta</label>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-900"
            />
          </div>
          <button
            onClick={cargar}
            disabled={loading}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-200 font-medium text-sm shadow-sm hover:shadow transition-all disabled:opacity-50"
          >
            {loading ? "Cargando..." : "Generar reporte"}
          </button>
        </div>
      </div>

      {data && (
        <>
          <div className="flex gap-3">
            <button
              onClick={exportarExcel}
              disabled={exporting}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-200 font-medium text-sm shadow-sm hover:shadow transition-all disabled:opacity-50"
            >
              {exporting ? "Exportando..." : "Exportar Excel"}
            </button>
            <button
              onClick={exportarCSV}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 font-medium text-sm transition-colors"
            >
              Exportar CSV
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
            <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Ingresos</p>
              <p className="text-xl font-bold text-emerald-600 tabular-nums">${data.totales.ingresos.toLocaleString("es-AR")}</p>
            </div>
            <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Pagos proveedores</p>
              <p className="text-xl font-bold text-rose-600 tabular-nums">${data.totales.pagosProveedores.toLocaleString("es-AR")}</p>
            </div>
            <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Utileros</p>
              <p className="text-xl font-bold text-rose-600 tabular-nums">${data.totales.utileros.toLocaleString("es-AR")}</p>
            </div>
            <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Caja chica</p>
              <p className="text-xl font-bold text-slate-700 tabular-nums">${(data.totales.cajaChica ?? 0).toLocaleString("es-AR")}</p>
            </div>
            <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Egresos totales</p>
              <p className="text-xl font-bold text-rose-600 tabular-nums">${data.totales.egresos.toLocaleString("es-AR")}</p>
            </div>
            <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Balance</p>
              <p className={`text-xl font-bold tabular-nums ${data.totales.balance >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                ${data.totales.balance.toLocaleString("es-AR")}
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-700 bg-slate-800">
                <h3 className="font-semibold text-white text-sm uppercase tracking-wider">Gastos por rubro</h3>
              </div>
              <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
                {data.porRubro.length === 0 ? (
                  <p className="text-slate-500 text-sm">Sin datos</p>
                ) : (
                  data.porRubro.map((r) => (
                    <div key={r.rubro} className="flex justify-between items-center py-2 px-3 rounded-lg bg-slate-50 hover:bg-slate-100/80 transition-colors">
                      <span className="text-slate-700 font-medium">{r.rubro}</span>
                      <span className="text-slate-900 font-semibold tabular-nums">${r.total.toLocaleString("es-AR")}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-700 bg-slate-800">
                <h3 className="font-semibold text-white text-sm uppercase tracking-wider">Gastos por proveedor</h3>
              </div>
              <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
                {data.porProveedor.length === 0 ? (
                  <p className="text-slate-500 text-sm">Sin datos</p>
                ) : (
                  data.porProveedor.map((p) => (
                    <div key={p.proveedor} className="flex justify-between items-center py-2 px-3 rounded-lg bg-slate-50 hover:bg-slate-100/80 transition-colors">
                      <span className="text-slate-700 font-medium">{p.proveedor}</span>
                      <span className="text-slate-900 font-semibold tabular-nums">${p.total.toLocaleString("es-AR")}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
