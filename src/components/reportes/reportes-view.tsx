"use client";

import { useState } from "react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

type ReporteData = {
  desde: string;
  hasta: string;
  porRubro: Array<{ rubro: string; total: number; cantidad: number }>;
  porProveedor: Array<{ proveedor: string; total: number; cantidad: number }>;
  porEvento: Array<{
    eventoId: string;
    nombre: string;
    cliente: string;
    fecha: string;
    ingresos: number;
    pagosProveedores: number;
    utileros: number;
    cajaChica: number;
    egresos: number;
    balance: number;
  }>;
  totales: {
    pagosProveedores: number;
    utileros: number;
    cajaChica?: number;
    ingresos: number;
    egresos: number;
    balance: number;
  };
};

type EgresoChartDatum = {
  name: string;
  value: number;
  color: string;
  pct: number;
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
  const [error, setError] = useState("");
  const [hoveredEgreso, setHoveredEgreso] = useState<EgresoChartDatum | null>(null);

  const COLORS = {
    ingresos: "#16a34a",
    pagos: "#ef4444",
    utileros: "#f97316",
    caja: "#64748b",
  };

  const formatMoney = (value: number) =>
    `$${value.toLocaleString("es-AR", {
      maximumFractionDigits: 2,
    })}`;
  const formatPercent = (value: number) => `${value.toFixed(1)}%`;
  const egresosData = data
    ? [
        { name: "Pagos proveedores", value: data.totales.pagosProveedores, color: COLORS.pagos },
        { name: "Utileros", value: data.totales.utileros, color: COLORS.utileros },
        { name: "Caja chica", value: data.totales.cajaChica ?? 0, color: COLORS.caja },
      ]
        .filter((d) => d.value > 0)
        .map((d) => ({
          ...d,
          pct: data.totales.egresos > 0 ? (d.value / data.totales.egresos) * 100 : 0,
        }))
    : [];

  async function cargar() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(
        `/api/reportes?desde=${desde}&hasta=${hasta}`
      );
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Error al generar reporte");
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar reporte");
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

  async function exportarPDF() {
    if (!data) return;
    setExporting(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;
      const right = pageWidth - margin;
      const subtitle = `Periodo: ${data.desde} a ${data.hasta}`;
      const contentTop = 30;
      const contentBottom = pageHeight - 14;
      let y = 0;

      const money = (n: number) => formatMoney(n);
      const textTrim = (value: string, maxLen: number) =>
        value.length > maxLen ? `${value.slice(0, maxLen)}...` : value;

      const drawPageFrame = () => {
        doc.setFillColor(248, 250, 252);
        doc.rect(0, 0, pageWidth, pageHeight, "F");

        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, pageWidth, 24, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("Reporte financiero", margin, 10);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(subtitle, margin, 16);

        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(margin, contentTop, pageWidth - margin * 2, contentBottom - contentTop, 2, 2, "FD");

        doc.setDrawColor(226, 232, 240);
        doc.line(margin, pageHeight - 10, right, pageHeight - 10);
        doc.setTextColor(100, 116, 139);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text("HC Eventos - Reporte generado automaticamente", margin, pageHeight - 6);
      };

      const drawKpiCard = (
        x: number,
        top: number,
        label: string,
        value: string,
        color: [number, number, number]
      ) => {
        const cardW = (pageWidth - margin * 2 - 10) / 2;
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(x, top, cardW, 19, 2, 2, "FD");
        doc.setTextColor(100, 116, 139);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(label, x + 3, top + 6);
        doc.setTextColor(color[0], color[1], color[2]);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(value, x + 3, top + 14);
      };

      const drawTableHeader = (top: number) => {
        doc.setFillColor(241, 245, 249);
        doc.rect(margin + 2, top, pageWidth - margin * 2 - 4, 7, "F");
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(51, 65, 85);
        doc.text("Evento", margin + 4, top + 4.8);
        doc.text("Fecha", margin + 84, top + 4.8);
        doc.text("Ingresos", margin + 120, top + 4.8, { align: "right" });
        doc.text("Utileros", margin + 142, top + 4.8, { align: "right" });
        doc.text("Egresos", margin + 164, top + 4.8, { align: "right" });
        doc.text("Balance", right - 4, top + 4.8, { align: "right" });
      };

      drawPageFrame();
      y = 36;
      const leftX = margin + 2;
      const rightX = leftX + (pageWidth - margin * 2 - 10) / 2 + 6;
      drawKpiCard(leftX, y, "Ingresos", money(data.totales.ingresos), [22, 163, 74]);
      drawKpiCard(rightX, y, "Egresos", money(data.totales.egresos), [239, 68, 68]);
      y += 23;
      drawKpiCard(
        leftX,
        y,
        "Balance",
        money(data.totales.balance),
        data.totales.balance >= 0 ? [22, 163, 74] : [239, 68, 68]
      );
      drawKpiCard(
        rightX,
        y,
        "Pagos + Utileros + Caja",
        money(data.totales.pagosProveedores + data.totales.utileros + (data.totales.cajaChica ?? 0)),
        [51, 65, 85]
      );
      y += 28;

      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Desglose por evento", margin + 2, y);
      y += 4;
      drawTableHeader(y);
      y += 10;

      for (let i = 0; i < data.porEvento.length; i++) {
        const e = data.porEvento[i];
        if (y > pageHeight - 28) {
          doc.addPage();
          drawPageFrame();
          y = 36;
          doc.setTextColor(15, 23, 42);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(11);
          doc.text("Desglose por evento (continuacion)", margin + 2, y);
          y += 4;
          drawTableHeader(y);
          y += 10;
        }

        if (i % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin + 2, y - 3.8, pageWidth - margin * 2 - 4, 6.2, "F");
        }
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(51, 65, 85);
        const name = textTrim(`${e.nombre} (${e.cliente})`, 30);
        doc.text(name, margin + 4, y);
        doc.text(new Date(e.fecha).toLocaleDateString("es-AR"), margin + 84, y);
        doc.text(money(e.ingresos), margin + 120, y, { align: "right" });
        doc.text(money(e.utileros), margin + 142, y, { align: "right" });
        doc.text(money(e.egresos), margin + 164, y, { align: "right" });
        doc.setTextColor(e.balance >= 0 ? 22 : 239, e.balance >= 0 ? 163 : 68, e.balance >= 0 ? 74 : 68);
        doc.text(money(e.balance), right - 4, y, { align: "right" });
        y += 5.7;
      }

      y += 4;
      if (y > pageHeight - 30) {
        doc.addPage();
        drawPageFrame();
        y = 36;
      }
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Top rubros", margin + 2, y);
      y += 5;

      for (let i = 0; i < data.porRubro.slice(0, 8).length; i++) {
        const r = data.porRubro[i];
        if (y > pageHeight - 24) {
          doc.addPage();
          drawPageFrame();
          y = 36;
          doc.setTextColor(15, 23, 42);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(11);
          doc.text("Top rubros (continuacion)", margin + 2, y);
          y += 6;
        }
        doc.setFillColor(i % 2 === 0 ? 248 : 255, i % 2 === 0 ? 250 : 255, i % 2 === 0 ? 252 : 255);
        doc.rect(margin + 2, y - 3.8, pageWidth - margin * 2 - 4, 6.2, "F");
        doc.setTextColor(51, 65, 85);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.text(textTrim(r.rubro, 34), margin + 4, y);
        doc.setFont("helvetica", "bold");
        doc.text(money(r.total), right - 4, y, { align: "right" });
        y += 5.7;
      }

      doc.save(`reporte-${data.desde}-${data.hasta}.pdf`);
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
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-6 py-5">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-600">Período de análisis</p>
          <h2 className="text-lg font-semibold tracking-tight text-neutral-900">
            Filtros por período
          </h2>
          <p className="mt-1 text-sm text-neutral-500">Seleccioná el rango para actualizar indicadores y gráficos.</p>
        </div>
        <div className="p-6 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs text-neutral-500 font-medium mb-1">Desde</label>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="px-4 py-2 rounded-lg bg-white border border-neutral-200 text-neutral-900"
            />
          </div>
          <div>
            <label className="block text-xs text-neutral-500 font-medium mb-1">Hasta</label>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="px-4 py-2 rounded-lg bg-white border border-neutral-200 text-neutral-900"
            />
          </div>
          <button
            onClick={cargar}
            disabled={loading}
            className="px-4 py-2.5 bg-white hover:bg-neutral-50 text-neutral-700 rounded-lg border border-neutral-200 font-medium text-sm shadow-sm hover:shadow transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <LoadingSpinner className="h-4 w-4" /> : null}
            {loading ? "Cargando..." : "Generar reporte"}
          </button>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        </div>
      </div>

      {data && (
        <>
          <div className="flex gap-3">
            <button
              onClick={exportarPDF}
              disabled={exporting}
              className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg border border-neutral-900 font-medium text-sm shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {exporting ? <LoadingSpinner className="h-4 w-4" /> : null}
              {exporting ? "Exportando..." : "Exportar PDF"}
            </button>
            <button
              onClick={exportarExcel}
              disabled={exporting}
              className="px-4 py-2.5 bg-white hover:bg-neutral-50 text-neutral-700 rounded-lg border border-neutral-200 font-medium text-sm shadow-sm hover:shadow transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {exporting ? <LoadingSpinner className="h-4 w-4" /> : null}
              {exporting ? "Exportando..." : "Exportar Excel"}
            </button>
            <button
              onClick={exportarCSV}
              className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg border border-neutral-200 font-medium text-sm transition-colors"
            >
              Exportar CSV
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
            <div className="rounded-2xl border border-neutral-200/70 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
              <p className="text-neutral-500 text-xs font-semibold uppercase tracking-wider mb-1">Ingresos</p>
              <p className="text-xl font-bold text-emerald-600 tabular-nums">${data.totales.ingresos.toLocaleString("es-AR")}</p>
            </div>
            <div className="rounded-2xl border border-neutral-200/70 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
              <p className="text-neutral-500 text-xs font-semibold uppercase tracking-wider mb-1">Pagos proveedores</p>
              <p className="text-xl font-bold text-rose-600 tabular-nums">${data.totales.pagosProveedores.toLocaleString("es-AR")}</p>
            </div>
            <div className="rounded-2xl border border-neutral-200/70 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
              <p className="text-neutral-500 text-xs font-semibold uppercase tracking-wider mb-1">Utileros</p>
              <p className="text-xl font-bold text-rose-600 tabular-nums">${data.totales.utileros.toLocaleString("es-AR")}</p>
            </div>
            <div className="rounded-2xl border border-neutral-200/70 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
              <p className="text-neutral-500 text-xs font-semibold uppercase tracking-wider mb-1">Caja chica</p>
              <p className="text-xl font-bold text-neutral-700 tabular-nums">${(data.totales.cajaChica ?? 0).toLocaleString("es-AR")}</p>
            </div>
            <div className="rounded-2xl border border-neutral-200/70 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
              <p className="text-neutral-500 text-xs font-semibold uppercase tracking-wider mb-1">Egresos totales</p>
              <p className="text-xl font-bold text-rose-600 tabular-nums">${data.totales.egresos.toLocaleString("es-AR")}</p>
            </div>
            <div className="rounded-2xl border border-neutral-200/70 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
              <p className="text-neutral-500 text-xs font-semibold uppercase tracking-wider mb-1">Balance</p>
              <p className={`text-xl font-bold tabular-nums ${data.totales.balance >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                ${data.totales.balance.toLocaleString("es-AR")}
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-700 bg-neutral-800">
                <h3 className="font-semibold text-white text-sm uppercase tracking-wider">Distribucion de egresos</h3>
              </div>
              <div className="p-4">
                <div className="grid md:grid-cols-[1fr_220px] gap-4 items-center">
                  <div className="h-72 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={egresosData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={64}
                          outerRadius={98}
                          paddingAngle={2}
                          stroke="#ffffff"
                          strokeWidth={2}
                          onMouseEnter={(_, index) => setHoveredEgreso(egresosData[index] ?? null)}
                          onMouseLeave={() => setHoveredEgreso(null)}
                        >
                          {egresosData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center">
                        <p className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold">Egresos</p>
                        <p className="text-lg font-bold text-neutral-900 tabular-nums">
                          {formatMoney(data.totales.egresos)}
                        </p>
                      </div>
                    </div>
                    {hoveredEgreso ? (
                      <div className="absolute bottom-2 left-1/2 -tranneutral-x-1/2 rounded-lg border border-neutral-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-sm pointer-events-none min-w-[220px]">
                        <p className="text-sm font-semibold text-neutral-700">{hoveredEgreso.name}</p>
                        <p className="text-2xl font-bold text-neutral-900 tabular-nums">
                          {formatMoney(hoveredEgreso.value)}
                        </p>
                        <p className="text-sm text-neutral-500">{formatPercent(hoveredEgreso.pct)} del total</p>
                      </div>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    {egresosData.length === 0 ? (
                      <p className="text-sm text-neutral-500">Sin datos para el periodo</p>
                    ) : (
                      egresosData.map((item) => (
                        <div key={item.name} className="rounded-lg border border-neutral-200 p-3 bg-neutral-50/70">
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-2 text-sm font-medium text-neutral-700">
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: item.color }}
                              />
                              {item.name}
                            </span>
                            <span className="text-xs font-semibold text-neutral-500">
                              {formatPercent(item.pct)}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-neutral-900 tabular-nums mt-1">
                            {formatMoney(item.value)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-700 bg-neutral-800">
                <h3 className="font-semibold text-white text-sm uppercase tracking-wider">Eventos por egresos</h3>
              </div>
              <div className="p-4 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.porEvento.slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="nombre"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v: string) => (v.length > 11 ? `${v.slice(0, 11)}...` : v)}
                    />
                    <YAxis tickFormatter={(v) => `$${Number(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => formatMoney(Number(v ?? 0))} />
                    <Bar dataKey="egresos" fill="#334155" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-700 bg-neutral-800">
              <h3 className="font-semibold text-white text-sm uppercase tracking-wider">Desglose por evento</h3>
              <p className="text-neutral-300 text-xs mt-0.5">Ingresos, egresos y balance por cada evento del periodo</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs uppercase text-neutral-500">Evento</th>
                    <th className="text-left px-4 py-3 text-xs uppercase text-neutral-500">Cliente</th>
                    <th className="text-left px-4 py-3 text-xs uppercase text-neutral-500">Fecha</th>
                    <th className="text-right px-4 py-3 text-xs uppercase text-neutral-500">Ingresos</th>
                    <th className="text-right px-4 py-3 text-xs uppercase text-neutral-500">Utileros</th>
                    <th className="text-right px-4 py-3 text-xs uppercase text-neutral-500">Egresos</th>
                    <th className="text-right px-4 py-3 text-xs uppercase text-neutral-500">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {data.porEvento.map((e) => (
                    <tr key={e.eventoId} className="hover:bg-neutral-50">
                      <td className="px-4 py-3 font-medium text-neutral-900">{e.nombre}</td>
                      <td className="px-4 py-3 text-neutral-600">{e.cliente}</td>
                      <td className="px-4 py-3 text-neutral-600">
                        {new Date(e.fecha).toLocaleDateString("es-AR")}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-600 font-semibold tabular-nums">
                        {formatMoney(e.ingresos)}
                      </td>
                      <td className="px-4 py-3 text-right text-amber-600 font-semibold tabular-nums">
                        {formatMoney(e.utileros)}
                      </td>
                      <td className="px-4 py-3 text-right text-rose-600 font-semibold tabular-nums">
                        {formatMoney(e.egresos)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-semibold tabular-nums ${
                          e.balance >= 0 ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {formatMoney(e.balance)}
                      </td>
                    </tr>
                  ))}
                  {data.porEvento.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-neutral-500">
                        No hay eventos en el periodo seleccionado
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-700 bg-neutral-800">
                <h3 className="font-semibold text-white text-sm uppercase tracking-wider">Gastos por rubro</h3>
              </div>
              <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
                {data.porRubro.length === 0 ? (
                  <p className="text-neutral-500 text-sm">Sin datos</p>
                ) : (
                  data.porRubro.map((r) => (
                    <div key={r.rubro} className="flex justify-between items-center py-2 px-3 rounded-lg bg-neutral-50 hover:bg-neutral-100/80 transition-colors">
                      <span className="text-neutral-700 font-medium">{r.rubro}</span>
                      <span className="text-neutral-900 font-semibold tabular-nums">${r.total.toLocaleString("es-AR")}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-700 bg-neutral-800">
                <h3 className="font-semibold text-white text-sm uppercase tracking-wider">Gastos por proveedor</h3>
              </div>
              <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
                {data.porProveedor.length === 0 ? (
                  <p className="text-neutral-500 text-sm">Sin datos</p>
                ) : (
                  data.porProveedor.map((p) => (
                    <div key={p.proveedor} className="flex justify-between items-center py-2 px-3 rounded-lg bg-neutral-50 hover:bg-neutral-100/80 transition-colors">
                      <span className="text-neutral-700 font-medium">{p.proveedor}</span>
                      <span className="text-neutral-900 font-semibold tabular-nums">${p.total.toLocaleString("es-AR")}</span>
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
