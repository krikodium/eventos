"use client";

import { useMemo, useState } from "react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ReportMode = "periodo" | "historico";
type HistoricalRange = "12" | "24" | "36" | "todo";
type ExportType = "pdf" | "excel" | null;

type HistoricoMes = {
  periodo: string;
  ingresos: number;
  pagosProveedores: number;
  utileros: number;
  cajaChica: number;
  egresos: number;
  balance: number;
  eventos: number;
  margenPct: number;
};

type ReporteData = {
  modo: ReportMode;
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
  historico: HistoricoMes[];
  totales: {
    pagosProveedores: number;
    utileros: number;
    cajaChica: number;
    ingresos: number;
    egresos: number;
    balance: number;
  };
};

const COLORS = {
  ingresos: "#10b981",
  pagos: "#ef4444",
  utileros: "#f59e0b",
  caja: "#64748b",
  balance: "#343433",
};

function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function firstDayMonthsAgo(months: number) {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() - months);
  return toDateInput(date);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompactMoney(value: number) {
  return new Intl.NumberFormat("es-AR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDate(value: string) {
  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("es-AR");
}

function formatMonth(periodo: string) {
  const [year, month] = periodo.split("-").map(Number);
  return new Date(year, month - 1, 1)
    .toLocaleDateString("es-AR", { month: "short", year: "2-digit" })
    .replace(" de ", " ");
}

function ReportIcon({ name }: { name: "calendar" | "history" | "chart" | "download" | "trend" }) {
  const paths = {
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></>,
    chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
    download: <><path d="M12 3v12m0 0 4-4m-4 4-4-4" /><path d="M4 19v2h16v-2" /></>,
    trend: <><path d="m3 17 6-6 4 4 8-9" /><path d="M15 6h6v6" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">{paths[name]}</svg>;
}

function RankingList({
  title,
  description,
  items,
  emptyLabel,
}: {
  title: string;
  description: string;
  items: Array<{ name: string; total: number; count: number }>;
  emptyLabel: string;
}) {
  const max = Math.max(...items.map((item) => item.total), 1);
  return (
    <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="border-b border-neutral-100 px-5 py-5 sm:px-6">
        <h3 className="font-semibold tracking-tight text-neutral-950">{title}</h3>
        <p className="mt-1 text-xs text-neutral-500">{description}</p>
      </div>
      <div className="max-h-[390px] space-y-4 overflow-y-auto p-5 sm:p-6">
        {items.length === 0 ? <p className="py-8 text-center text-sm text-neutral-500">{emptyLabel}</p> : items.map((item, index) => (
          <div key={item.name}>
            <div className="mb-2 flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-[11px] font-bold text-neutral-500">{index + 1}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-800">{item.name}</p>
                  <p className="mt-0.5 text-[11px] text-neutral-400">{item.count} {item.count === 1 ? "movimiento" : "movimientos"}</p>
                </div>
              </div>
              <p className="shrink-0 text-sm font-semibold tabular-nums text-neutral-950">{formatMoney(item.total)}</p>
            </div>
            <div className="ml-10 h-1.5 overflow-hidden rounded-full bg-neutral-100">
              <div className="h-full rounded-full bg-sky-500" style={{ width: `${Math.max(4, (item.total / max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ReportesView() {
  const today = useMemo(() => new Date(), []);
  const [mode, setMode] = useState<ReportMode>("periodo");
  const [historicalRange, setHistoricalRange] = useState<HistoricalRange>("12");
  const [activePreset, setActivePreset] = useState("mes");
  const [desde, setDesde] = useState(toDateInput(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [hasta, setHasta] = useState(toDateInput(today));
  const [data, setData] = useState<ReporteData | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<ExportType>(null);
  const [error, setError] = useState("");

  const egresosData = useMemo(() => {
    if (!data) return [];
    return [
      { name: "Proveedores", value: data.totales.pagosProveedores, color: COLORS.pagos },
      { name: "Utileros", value: data.totales.utileros, color: COLORS.utileros },
      { name: "Caja chica", value: data.totales.cajaChica, color: COLORS.caja },
    ].filter((item) => item.value > 0);
  }, [data]);

  const historicalChartData = useMemo(
    () => data?.historico.map((item) => ({ ...item, label: formatMonth(item.periodo) })) ?? [],
    [data]
  );
  const historicalChartWidth = Math.max(760, historicalChartData.length * 68);
  const cantidadEventos = data?.porEvento.length ?? 0;
  const margen = data && data.totales.ingresos > 0 ? (data.totales.balance / data.totales.ingresos) * 100 : 0;
  const rentables = data?.porEvento.filter((evento) => evento.balance >= 0).length ?? 0;
  const mejorMes = historicalChartData.reduce<HistoricoMes & { label: string } | null>(
    (best, current) => !best || current.balance > best.balance ? current : best,
    null
  );
  const peorMes = historicalChartData.reduce<HistoricoMes & { label: string } | null>(
    (worst, current) => !worst || current.balance < worst.balance ? current : worst,
    null
  );

  function selectMode(nextMode: ReportMode) {
    setMode(nextMode);
    setError("");
    if (nextMode === "historico") {
      setHistoricalRange("12");
      setDesde(firstDayMonthsAgo(11));
      setHasta(toDateInput(today));
    } else {
      setActivePreset("mes");
      setDesde(toDateInput(new Date(today.getFullYear(), today.getMonth(), 1)));
      setHasta(toDateInput(today));
    }
  }

  function applyPeriodPreset(preset: "mes" | "trimestre" | "anio") {
    setActivePreset(preset);
    setHasta(toDateInput(today));
    if (preset === "mes") setDesde(toDateInput(new Date(today.getFullYear(), today.getMonth(), 1)));
    if (preset === "trimestre") setDesde(firstDayMonthsAgo(2));
    if (preset === "anio") setDesde(toDateInput(new Date(today.getFullYear(), 0, 1)));
  }

  function applyHistoricalRange(range: HistoricalRange) {
    setHistoricalRange(range);
    setHasta(toDateInput(today));
    if (range !== "todo") setDesde(firstDayMonthsAgo(Number(range) - 1));
  }

  async function cargar() {
    setError("");
    if (mode === "periodo" && desde > hasta) {
      setError("La fecha desde no puede ser posterior a la fecha hasta.");
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ modo: mode, hasta });
      if (mode === "historico") params.set("alcance", historicalRange);
      if (!(mode === "historico" && historicalRange === "todo")) params.set("desde", desde);
      const response = await fetch(`/api/reportes?${params.toString()}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "No se pudo generar el reporte.");
      setData(payload);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo generar el reporte.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  async function exportarExcel() {
    if (!data) return;
    setExporting("excel");
    try {
      const XLSX = (await import("xlsx")).default;
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([
        { Concepto: "Ingresos", Monto: data.totales.ingresos },
        { Concepto: "Pagos a proveedores", Monto: data.totales.pagosProveedores },
        { Concepto: "Utileros", Monto: data.totales.utileros },
        { Concepto: "Caja chica", Monto: data.totales.cajaChica },
        { Concepto: "Egresos", Monto: data.totales.egresos },
        { Concepto: "Balance", Monto: data.totales.balance },
        { Concepto: "Margen", Monto: margen / 100 },
      ]), "Resumen");
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.porEvento.map((evento) => ({
        Evento: evento.nombre,
        Cliente: evento.cliente,
        Fecha: formatDate(evento.fecha),
        Ingresos: evento.ingresos,
        Proveedores: evento.pagosProveedores,
        Utileros: evento.utileros,
        "Caja chica": evento.cajaChica,
        Egresos: evento.egresos,
        Balance: evento.balance,
      }))), "Eventos");
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.historico.map((mes) => ({
        Mes: mes.periodo,
        Ingresos: mes.ingresos,
        Egresos: mes.egresos,
        Balance: mes.balance,
        Margen: mes.margenPct / 100,
        Eventos: mes.eventos,
      }))), "Histórico mensual");
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.porRubro), "Rubros");
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.porProveedor), "Proveedores");
      XLSX.writeFile(workbook, `reporte-${data.desde}-${data.hasta}.xlsx`);
    } catch {
      setError("No se pudo exportar el archivo Excel.");
    } finally {
      setExporting(null);
    }
  }

  async function exportarPDF() {
    if (!data) return;
    setExporting("pdf");
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const marginX = 14;
      const right = 196;
      let y = 18;
      const addHeader = () => {
        doc.setFillColor(11, 13, 16);
        doc.rect(0, 0, 210, 28, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(15);
        doc.text(data.modo === "historico" ? "Reporte financiero histórico" : "Reporte financiero", marginX, 12);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(190, 200, 214);
        doc.text(`${formatDate(data.desde)} — ${formatDate(data.hasta)}`, marginX, 19);
        y = 38;
      };
      const ensureSpace = (height: number) => {
        if (y + height < 280) return;
        doc.addPage();
        addHeader();
      };
      addHeader();
      const summary = [
        ["Ingresos", formatMoney(data.totales.ingresos)],
        ["Egresos", formatMoney(data.totales.egresos)],
        ["Balance", formatMoney(data.totales.balance)],
        ["Margen", `${margen.toFixed(1)}%`],
      ];
      summary.forEach(([label, value], index) => {
        const x = marginX + (index % 2) * 92;
        const top = y + Math.floor(index / 2) * 20;
        doc.setFillColor(247, 248, 250);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(x, top, 86, 15, 2, 2, "FD");
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(8);
        doc.text(label, x + 4, top + 5);
        doc.setTextColor(15, 23, 42);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(value, x + 4, top + 11.5);
      });
      y += 47;
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Desglose por evento", marginX, y);
      y += 7;
      for (const evento of data.porEvento) {
        ensureSpace(10);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(51, 65, 85);
        doc.text(`${evento.nombre.slice(0, 30)} · ${evento.cliente.slice(0, 24)}`, marginX, y);
        doc.text(formatMoney(evento.balance), right, y, { align: "right" });
        doc.setDrawColor(235, 238, 242);
        doc.line(marginX, y + 3, right, y + 3);
        y += 8;
      }
      if (data.historico.length) {
        ensureSpace(18);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text("Evolución mensual", marginX, y);
        y += 7;
        for (const mes of data.historico) {
          ensureSpace(9);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(71, 85, 105);
          doc.text(formatMonth(mes.periodo), marginX, y);
          doc.text(`Ingresos ${formatMoney(mes.ingresos)}`, 74, y);
          doc.text(`Balance ${formatMoney(mes.balance)}`, right, y, { align: "right" });
          y += 7;
        }
      }
      doc.save(`reporte-${data.desde}-${data.hasta}.pdf`);
    } catch {
      setError("No se pudo exportar el PDF.");
    } finally {
      setExporting(null);
    }
  }

  function exportarCSV() {
    if (!data) return;
    const csvCell = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
    const lines = [
      ["Mes", "Ingresos", "Egresos", "Balance", "Margen", "Eventos"].map(csvCell).join(","),
      ...data.historico.map((mes) => [mes.periodo, mes.ingresos, mes.egresos, mes.balance, mes.margenPct, mes.eventos].map(csvCell).join(",")),
      "",
      ["Evento", "Cliente", "Fecha", "Ingresos", "Egresos", "Balance"].map(csvCell).join(","),
      ...data.porEvento.map((evento) => [evento.nombre, evento.cliente, evento.fecha, evento.ingresos, evento.egresos, evento.balance].map(csvCell).join(",")),
    ];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `reporte-${data.desde}-${data.hasta}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
        <div className="grid gap-6 border-b border-neutral-100 px-5 py-6 sm:px-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">Configuración del análisis</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-neutral-950">¿Qué querés analizar?</h2>
            <p className="mt-1 text-sm text-neutral-500">Elegí un período puntual o mirá la evolución financiera de varios meses.</p>
          </div>
          <div className="inline-flex w-full rounded-xl bg-neutral-100 p-1 lg:w-auto" role="group" aria-label="Tipo de reporte">
            <button type="button" onClick={() => selectMode("periodo")} aria-pressed={mode === "periodo"} className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition lg:flex-none ${mode === "periodo" ? "bg-white text-neutral-950 shadow-sm" : "text-neutral-500 hover:text-neutral-800"}`}><ReportIcon name="calendar" />Por período</button>
            <button type="button" onClick={() => selectMode("historico")} aria-pressed={mode === "historico"} className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition lg:flex-none ${mode === "historico" ? "bg-sky-600 text-white shadow-sm shadow-sky-600/20" : "text-neutral-500 hover:text-neutral-800"}`}><ReportIcon name="history" />Histórico</button>
          </div>
        </div>

        <div className="p-5 sm:p-7">
          {mode === "periodo" ? (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)_auto] xl:items-end">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">Accesos rápidos</p>
                <div className="grid grid-cols-3 gap-2">
                  {([['mes', 'Mes actual'], ['trimestre', 'Últimos 3 meses'], ['anio', 'Año actual']] as const).map(([value, label]) => (
                    <button key={value} type="button" onClick={() => applyPeriodPreset(value)} className={`rounded-xl border px-3 py-3 text-xs font-semibold transition ${activePreset === value ? "border-sky-200 bg-sky-50 text-sky-800" : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50"}`}>{label}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label htmlFor="report-desde" className="mb-1.5 block text-xs font-semibold text-neutral-600">Desde</label><input id="report-desde" type="date" value={desde} onChange={(event) => { setDesde(event.target.value); setActivePreset("personalizado"); }} max={hasta} className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-sm text-neutral-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100" /></div>
                <div><label htmlFor="report-hasta" className="mb-1.5 block text-xs font-semibold text-neutral-600">Hasta</label><input id="report-hasta" type="date" value={hasta} onChange={(event) => { setHasta(event.target.value); setActivePreset("personalizado"); }} min={desde} className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-sm text-neutral-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100" /></div>
              </div>
              <button type="button" onClick={cargar} disabled={loading} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-600/20 transition hover:bg-sky-700 disabled:opacity-60">{loading ? <LoadingSpinner className="h-4 w-4 text-white" /> : <ReportIcon name="chart" />}{loading ? "Generando..." : "Generar reporte"}</button>
            </div>
          ) : (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">Profundidad histórica</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {([['12', '12 meses', 'Último año'], ['24', '24 meses', 'Dos años'], ['36', '36 meses', 'Tres años'], ['todo', 'Todo', 'Desde el primer registro']] as const).map(([value, label, detail]) => (
                    <button key={value} type="button" onClick={() => applyHistoricalRange(value)} className={`rounded-xl border px-4 py-3 text-left transition ${historicalRange === value ? "border-sky-300 bg-sky-50 text-sky-950 shadow-sm shadow-sky-100" : "border-neutral-200 bg-white text-neutral-700 hover:border-sky-200 hover:bg-sky-50/40"}`}><span className="block text-sm font-semibold">{label}</span><span className={`mt-0.5 block text-[11px] ${historicalRange === value ? "text-sky-600" : "text-neutral-400"}`}>{detail}</span></button>
                  ))}
                </div>
              </div>
              <button type="button" onClick={cargar} disabled={loading} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-sky-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-600/20 transition hover:bg-sky-700 disabled:opacity-60">{loading ? <LoadingSpinner className="h-4 w-4 text-white" /> : <ReportIcon name="history" />}{loading ? "Construyendo histórico..." : "Generar histórico"}</button>
            </div>
          )}
          {error && <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
        </div>
      </section>

      {!data && !loading ? (
        <section className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-neutral-300 bg-white/60 px-6 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700"><ReportIcon name="trend" /></span>
          <h3 className="mt-4 text-base font-semibold text-neutral-900">Tu análisis aparecerá acá</h3>
          <p className="mt-1 max-w-md text-sm text-neutral-500">Configurá el alcance y generá el reporte para ver resultados, evolución, rankings y exportaciones.</p>
        </section>
      ) : null}

      {data ? (
        <div className="space-y-6">
          <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-neutral-900">{data.modo === "historico" ? "Reporte histórico" : "Reporte por período"}</p>
              <p className="mt-0.5 text-xs text-neutral-500">{formatDate(data.desde)} — {formatDate(data.hasta)} · {cantidadEventos} eventos con movimientos</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={exportarPDF} disabled={exporting !== null} className="inline-flex items-center gap-2 rounded-xl bg-neutral-950 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50">{exporting === "pdf" ? <LoadingSpinner className="h-3.5 w-3.5 text-white" /> : <ReportIcon name="download" />}PDF</button>
              <button type="button" onClick={exportarExcel} disabled={exporting !== null} className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50">{exporting === "excel" ? <LoadingSpinner className="h-3.5 w-3.5" /> : <ReportIcon name="download" />}Excel</button>
              <button type="button" onClick={exportarCSV} className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-100"><ReportIcon name="download" />CSV</button>
            </div>
          </div>

          <section className="overflow-hidden rounded-3xl border border-sky-100 bg-white shadow-sm">
            <div className="h-1.5 bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400" />
            <div className="grid xl:grid-cols-[1.05fr_1fr]">
              <div className="relative overflow-hidden border-b border-sky-100 bg-gradient-to-br from-sky-50 via-white to-emerald-50/60 p-6 sm:p-8 xl:border-b-0 xl:border-r">
                <div className={`absolute bottom-0 left-0 top-0 w-1 ${data.totales.balance >= 0 ? "bg-emerald-500" : "bg-rose-500"}`} />
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-sky-200 bg-white text-sky-700 shadow-sm"><ReportIcon name="trend" /></span>
                  Resultado neto
                </div>
                <div className="mt-5 flex flex-wrap items-end gap-3">
                  <p className={`text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl ${data.totales.balance >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{formatMoney(data.totales.balance)}</p>
                  <span className={`mb-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${data.totales.balance >= 0 ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>{margen.toFixed(1)}% margen</span>
                </div>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-neutral-600">Ingresos menos pagos a proveedores, jornadas de utileros y egresos de caja chica dentro del período seleccionado.</p>
              </div>
              <div className="grid grid-cols-2 gap-px bg-neutral-100">
                {[['Ingresos', data.totales.ingresos, 'text-emerald-700', 'bg-emerald-500'], ['Egresos', data.totales.egresos, 'text-rose-700', 'bg-rose-500'], ['Eventos', cantidadEventos, 'text-neutral-950', 'bg-sky-500'], ['Rentables', `${rentables}/${cantidadEventos}`, 'text-sky-700', 'bg-cyan-500']].map(([label, value, color, accent]) => (
                  <div key={String(label)} className="group relative min-h-32 bg-white p-5 transition hover:bg-neutral-50/70 sm:p-6">
                    <span className={`absolute left-5 top-5 h-2 w-2 rounded-full ${accent}`} />
                    <p className="pl-4 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">{label}</p>
                    <p className={`mt-5 text-xl font-semibold tabular-nums sm:text-2xl ${color}`}>{typeof value === "number" && label !== "Eventos" ? formatMoney(value) : value}</p>
                    <p className="mt-1 text-[11px] text-neutral-400">{label === "Ingresos" ? "Facturación registrada" : label === "Egresos" ? "Costo operativo total" : label === "Eventos" ? "Con movimientos" : "Con balance positivo"}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="grid gap-4 sm:grid-cols-3">
            {[['Proveedores', data.totales.pagosProveedores, 'bg-rose-500'], ['Utileros', data.totales.utileros, 'bg-amber-500'], ['Caja chica', data.totales.cajaChica, 'bg-slate-500']].map(([label, value, color]) => (
              <div key={String(label)} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{label}</p><span className={`h-2.5 w-2.5 rounded-full ${color}`} /></div><p className="mt-4 text-2xl font-semibold tracking-tight tabular-nums text-neutral-950">{formatMoney(Number(value))}</p><p className="mt-1 text-xs text-neutral-400">{data.totales.egresos > 0 ? `${((Number(value) / data.totales.egresos) * 100).toFixed(1)}% de los egresos` : "Sin participación"}</p></div>
            ))}
          </div>

          <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-neutral-100 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
              <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-600">Evolución mensual</p><h3 className="mt-1 text-lg font-semibold tracking-tight text-neutral-950">Ingresos, egresos y balance</h3><p className="mt-1 text-xs text-neutral-500">Desplazate horizontalmente cuando el historial incluya muchos meses.</p></div>
              {mejorMes && peorMes ? <div className="flex gap-4 text-xs"><div><span className="text-neutral-400">Mejor mes</span><p className="mt-1 font-semibold text-emerald-700">{mejorMes.label} · {formatMoney(mejorMes.balance)}</p></div><div><span className="text-neutral-400">Menor resultado</span><p className="mt-1 font-semibold text-neutral-700">{peorMes.label} · {formatMoney(peorMes.balance)}</p></div></div> : null}
            </div>
            <div className="overflow-x-auto p-4 sm:p-6">
              <div className="h-80" style={{ width: historicalChartWidth }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={historicalChartData} margin={{ top: 12, right: 18, left: 6, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#737373" }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(value) => `$${formatCompactMoney(Number(value))}`} tick={{ fontSize: 11, fill: "#a3a3a3" }} axisLine={false} tickLine={false} width={70} />
                    <Tooltip formatter={(value, name) => [formatMoney(Number(value ?? 0)), name === "ingresos" ? "Ingresos" : name === "egresos" ? "Egresos" : "Balance"]} labelFormatter={(label) => `Período ${label}`} contentStyle={{ borderRadius: 12, borderColor: "#e5e7eb", boxShadow: "0 12px 30px rgba(15,23,42,.08)" }} />
                    <Bar dataKey="ingresos" fill={COLORS.ingresos} radius={[5, 5, 0, 0]} maxBarSize={24} />
                    <Bar dataKey="egresos" fill="#cbd5e1" radius={[5, 5, 0, 0]} maxBarSize={24} />
                    <Line type="monotone" dataKey="balance" stroke={COLORS.balance} strokeWidth={2.5} dot={{ r: 3, fill: COLORS.balance, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
            <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
              <div className="border-b border-neutral-100 px-5 py-5 sm:px-6"><h3 className="font-semibold tracking-tight text-neutral-950">Composición de egresos</h3><p className="mt-1 text-xs text-neutral-500">Distribución por tipo de costo.</p></div>
              <div className="grid items-center gap-4 p-5 sm:grid-cols-[1fr_190px] sm:p-6">
                <div className="relative h-64">
                  <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={egresosData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={3} stroke="#fff" strokeWidth={3}>{egresosData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip formatter={(value) => formatMoney(Number(value ?? 0))} contentStyle={{ borderRadius: 12, borderColor: "#e5e7eb" }} /></PieChart></ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Total</span><strong className="mt-1 text-lg tabular-nums text-neutral-950">{formatCompactMoney(data.totales.egresos)}</strong></div>
                </div>
                <div className="space-y-3">{egresosData.map((item) => <div key={item.name} className="rounded-xl bg-neutral-50 p-3"><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} /><span className="text-xs font-medium text-neutral-600">{item.name}</span></div><p className="mt-2 text-sm font-semibold tabular-nums text-neutral-950">{formatMoney(item.value)}</p><p className="mt-0.5 text-[11px] text-neutral-400">{data.totales.egresos > 0 ? `${((item.value / data.totales.egresos) * 100).toFixed(1)}% del total` : "0%"}</p></div>)}</div>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
              <div className="border-b border-neutral-100 px-5 py-5 sm:px-6"><h3 className="font-semibold tracking-tight text-neutral-950">Eventos con mayor egreso</h3><p className="mt-1 text-xs text-neutral-500">Los ocho eventos de mayor peso operativo.</p></div>
              <div className="h-[330px] p-5 sm:p-6"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.porEvento.slice(0, 8)} layout="vertical" margin={{ left: 10, right: 18 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" /><XAxis type="number" tickFormatter={(value) => `$${formatCompactMoney(Number(value))}`} tick={{ fontSize: 10, fill: "#a3a3a3" }} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="nombre" width={105} tick={{ fontSize: 11, fill: "#525252" }} axisLine={false} tickLine={false} tickFormatter={(value: string) => value.length > 16 ? `${value.slice(0, 16)}…` : value} /><Tooltip formatter={(value) => formatMoney(Number(value ?? 0))} contentStyle={{ borderRadius: 12, borderColor: "#e5e7eb" }} /><Bar dataKey="egresos" fill="#334155" radius={[0, 6, 6, 0]} maxBarSize={22} /></BarChart></ResponsiveContainer></div>
            </section>
          </div>

          <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-100 px-5 py-5 sm:px-6"><div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><h3 className="font-semibold tracking-tight text-neutral-950">Resultado por evento</h3><p className="mt-1 text-xs text-neutral-500">Detalle de ingresos, costos y resultado neto.</p></div><span className="text-xs font-medium text-neutral-400">{cantidadEventos} registros</span></div></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead className="bg-neutral-50/80"><tr>{["Evento / cliente", "Fecha", "Ingresos", "Proveedores", "Utileros", "Caja chica", "Balance"].map((label, index) => <th key={label} className={`px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 ${index > 1 ? "text-right" : "text-left"}`}>{label}</th>)}</tr></thead><tbody className="divide-y divide-neutral-100">{data.porEvento.map((evento) => { const eventMargin = evento.ingresos > 0 ? (evento.balance / evento.ingresos) * 100 : 0; return <tr key={evento.eventoId} className="transition hover:bg-neutral-50/70"><td className="px-5 py-4"><p className="font-medium text-neutral-900">{evento.nombre}</p><p className="mt-0.5 text-xs text-neutral-400">{evento.cliente}</p></td><td className="px-5 py-4 text-neutral-500">{formatDate(evento.fecha)}</td><td className="px-5 py-4 text-right font-medium tabular-nums text-emerald-700">{formatMoney(evento.ingresos)}</td><td className="px-5 py-4 text-right tabular-nums text-neutral-600">{formatMoney(evento.pagosProveedores)}</td><td className="px-5 py-4 text-right tabular-nums text-neutral-600">{formatMoney(evento.utileros)}</td><td className="px-5 py-4 text-right tabular-nums text-neutral-600">{formatMoney(evento.cajaChica)}</td><td className="px-5 py-4 text-right"><p className={`font-semibold tabular-nums ${evento.balance >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{formatMoney(evento.balance)}</p><span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${evento.balance >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{eventMargin.toFixed(1)}%</span></td></tr>; })}{cantidadEventos === 0 ? <tr><td colSpan={7} className="px-5 py-14 text-center text-neutral-500">No hay movimientos para el período seleccionado.</td></tr> : null}</tbody></table></div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <RankingList title="Gastos por rubro" description="Categorías con mayor impacto en proveedores." emptyLabel="No hay gastos por rubro." items={data.porRubro.map((item) => ({ name: item.rubro, total: item.total, count: item.cantidad }))} />
            <RankingList title="Gastos por proveedor" description="Proveedores con más movimientos acumulados." emptyLabel="No hay gastos por proveedor." items={data.porProveedor.map((item) => ({ name: item.proveedor, total: item.total, count: item.cantidad }))} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
