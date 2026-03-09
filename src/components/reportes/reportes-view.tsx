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
      <div className="flex flex-wrap gap-4 items-end p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Desde</label>
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="px-4 py-2 rounded bg-white border border-gray-300 text-gray-900"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Hasta</label>
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="px-4 py-2 rounded bg-white border border-gray-300 text-gray-900"
          />
        </div>
        <button
          onClick={cargar}
          disabled={loading}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded"
        >
          {loading ? "Cargando..." : "Generar reporte"}
        </button>
      </div>

      {data && (
        <>
          <div className="flex gap-4">
            <button
              onClick={exportarExcel}
              disabled={exporting}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded"
            >
              {exporting ? "Exportando..." : "Exportar Excel"}
            </button>
            <button
              onClick={exportarCSV}
              className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded border border-gray-300"
            >
              Exportar CSV
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <p className="text-gray-500 text-sm">Ingresos</p>
              <p className="text-xl font-bold text-sky-600">
                ${data.totales.ingresos.toLocaleString("es-AR")}
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <p className="text-gray-500 text-sm">Pagos proveedores</p>
              <p className="text-xl font-bold text-rose-600">
                ${data.totales.pagosProveedores.toLocaleString("es-AR")}
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <p className="text-gray-500 text-sm">Utileros</p>
              <p className="text-xl font-bold text-rose-600">
                ${data.totales.utileros.toLocaleString("es-AR")}
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <p className="text-gray-500 text-sm">Caja chica</p>
              <p className="text-xl font-bold text-gray-700">
                ${(data.totales.cajaChica ?? 0).toLocaleString("es-AR")}
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <p className="text-gray-500 text-sm">Egresos totales</p>
              <p className="text-xl font-bold text-rose-600">
                ${data.totales.egresos.toLocaleString("es-AR")}
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <p className="text-gray-500 text-sm">Balance</p>
              <p
                className={`text-xl font-bold ${
                  data.totales.balance >= 0 ? "text-sky-600" : "text-rose-600"
                }`}
              >
                ${data.totales.balance.toLocaleString("es-AR")}
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <h3 className="p-4 font-medium text-gray-900 border-b border-gray-200">
                Gastos por rubro
              </h3>
              <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
                {data.porRubro.length === 0 ? (
                  <p className="text-gray-500">Sin datos</p>
                ) : (
                  data.porRubro.map((r) => (
                    <div
                      key={r.rubro}
                      className="flex justify-between py-2 border-b border-gray-200"
                    >
                      <span className="text-gray-700">{r.rubro}</span>
                      <span className="text-gray-900 font-medium">
                        ${r.total.toLocaleString("es-AR")}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <h3 className="p-4 font-medium text-gray-900 border-b border-gray-200">
                Gastos por proveedor
              </h3>
              <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
                {data.porProveedor.length === 0 ? (
                  <p className="text-gray-500">Sin datos</p>
                ) : (
                  data.porProveedor.map((p) => (
                    <div
                      key={p.proveedor}
                      className="flex justify-between py-2 border-b border-gray-200"
                    >
                      <span className="text-gray-700">{p.proveedor}</span>
                      <span className="text-gray-900 font-medium">
                        ${p.total.toLocaleString("es-AR")}
                      </span>
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
