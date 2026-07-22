"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { jsPDF } from "jspdf";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Select } from "@/components/ui/select";

/** Overlay de carga al generar el PDF: badge "HC" fino con un punto de luz recorriendo el contorno. */
function PdfLoadingOverlay() {
  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-7 bg-neutral-950/85 backdrop-blur-md">
      <svg width="132" height="132" viewBox="0 0 120 120" className="overflow-visible">
        <defs>
          <filter id="hc-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="hc-comet" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#d7d4cd" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
        </defs>

        {/* Contorno base tenue */}
        <rect x="14" y="14" width="92" height="92" rx="24" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="2" />

        {/* Punto de luz que recorre el contorno */}
        <rect
          x="14" y="14" width="92" height="92" rx="24"
          fill="none" stroke="url(#hc-comet)" strokeWidth="3" strokeLinecap="round"
          strokeDasharray="10 330" filter="url(#hc-glow)"
        >
          <animate attributeName="stroke-dashoffset" from="340" to="0" dur="1.5s" repeatCount="indefinite" />
        </rect>

        {/* HC fino (contorno) */}
        <text
          x="60" y="61" textAnchor="middle" dominantBaseline="central"
          fontFamily="Arial, sans-serif" fontSize="40" fontWeight="800"
          fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.7"
        >
          HC
        </text>
      </svg>
      <div className="flex flex-col items-center gap-1">
        <p className="text-sm font-semibold tracking-wide text-white">Generando PDF…</p>
        <p className="text-xs text-white/50">Preparando tu presupuesto</p>
      </div>
    </div>
  );
}

type Item = {
  id: string;
  concepto: string;
  cantidad: number;
  precioInterno: number;
  precioCliente: number;
};

type PresupuestoGuardado = {
  id: string;
  empresa: string | null;
  cliente: string;
  evento: string;
  fecha: string;
  validez: number;
  presupuestoNro: string | null;
  formaPago: string | null;
  total: number;
  items: unknown;
  estadoEvento: string;
  honorariosTipo?: "FIJO" | "PORCENTAJE";
  honorariosMonto?: number;
  honorariosConcepto?: string;
  cargasSocialesPct?: number;
  impuestosPct?: number;
  createdAt: string;
};

const FORMA_PAGO_OPTIONS = [
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "TRANSFERENCIA", label: "Transferencia bancaria" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "50_50", label: "50% fact / 50% saldo" },
  { value: "30_70", label: "30% fact / 70% saldo" },
  { value: "OTRO", label: "Otro" },
];

function normalizarFormaPago(value: string | null): string {
  if (!value) return "TRANSFERENCIA";
  return FORMA_PAGO_OPTIONS.find(
    (option) => option.value === value || option.label === value
  )?.value ?? "OTRO";
}

function formatMoney(value: number): string {
  return value.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });
}

export function PresupuestosGenerator() {
  const router = useRouter();
  const [presupuestos, setPresupuestos] = useState<PresupuestoGuardado[]>([]);
  const [form, setForm] = useState({
    empresa: "",
    cliente: "",
    fecha: new Date().toISOString().slice(0, 10),
    validez: "15",
    presupuestoNro: "",
    formaPago: "TRANSFERENCIA",
    evento: "",
  });

  const [items, setItems] = useState<Item[]>([
    { id: "1", concepto: "", cantidad: 1, precioInterno: 0, precioCliente: 0 },
  ]);

  const [honorariosTipo, setHonorariosTipo] = useState<"FIJO" | "PORCENTAJE">("PORCENTAJE");
  const [honorariosMonto, setHonorariosMonto] = useState<number>(15);
  const [honorariosConcepto, setHonorariosConcepto] = useState("Honorarios HC");

  const [cargasSocialesPct, setCargasSocialesPct] = useState<number>(0);
  const [impuestosPct, setImpuestosPct] = useState<number>(0);

  const [exporting, setExporting] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [guardandoPresupuesto, setGuardandoPresupuesto] = useState(false);
  const [creandoEvento, setCreandoEvento] = useState(false);
  const [presupuestoId, setPresupuestoId] = useState<string>("");
  const [estadoEvento, setEstadoEvento] = useState<string>("BORRADOR");
  const [mensaje, setMensaje] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    fetch("/api/presupuestos")
      .then(async (r) => {
        const data = await r.json().catch(() => []);
        if (!r.ok) {
          setMensaje(data?.error ?? "No se pudieron cargar los presupuestos.");
          return;
        }
        setPresupuestos(Array.isArray(data) ? data : []);
      })
      .catch(console.error);
  }, []);

  function normalizarItems(raw: unknown): Item[] {
    const empty: Item = { id: crypto.randomUUID(), concepto: "", cantidad: 1, precioInterno: 0, precioCliente: 0 };
    if (!Array.isArray(raw)) return [empty];
    const out = raw
      .map((i) => {
        const it = i as Record<string, unknown>;
        const precioUnitario = Number(it.precioUnitario ?? 0);
        return {
          id: String(it.id ?? crypto.randomUUID()),
          concepto: String(it.concepto ?? ""),
          cantidad: Number(it.cantidad ?? 0),
          precioInterno: Number(it.precioInterno ?? precioUnitario),
          precioCliente: Number(it.precioCliente ?? precioUnitario),
        };
      })
      .filter((i) => !Number.isNaN(i.cantidad));
    return out.length > 0 ? out : [empty];
  }

  function cargarPresupuesto(id: string) {
    setPresupuestoId(id);
    const p = presupuestos.find((x) => x.id === id);
    if (!p) return;
    setForm({
      empresa: p.empresa ?? "",
      cliente: p.cliente,
      fecha: new Date(p.fecha).toISOString().slice(0, 10),
      validez: String(p.validez),
      presupuestoNro: p.presupuestoNro ?? "",
      formaPago: normalizarFormaPago(p.formaPago),
      evento: p.evento,
    });
    setItems(normalizarItems(p.items));
    setEstadoEvento(p.estadoEvento || "BORRADOR");
    if (p.honorariosTipo) setHonorariosTipo(p.honorariosTipo);
    if (p.honorariosMonto !== undefined) setHonorariosMonto(Number(p.honorariosMonto));
    if (p.honorariosConcepto) setHonorariosConcepto(p.honorariosConcepto);
    if (p.cargasSocialesPct !== undefined) setCargasSocialesPct(Number(p.cargasSocialesPct));
    if (p.impuestosPct !== undefined) setImpuestosPct(Number(p.impuestosPct));
    setMensaje("Presupuesto cargado.");
  }

  async function guardarPresupuesto() {
    if (!form.cliente || !form.evento || !form.fecha) {
      setMensaje("Completa al menos Cliente, Evento y Fecha antes de guardar.");
      return;
    }
    setGuardandoPresupuesto(true);
    setMensaje("");
    try {
      const formaPagoLabel = formaPagoOptions.find((o) => o.value === form.formaPago)?.label ?? form.formaPago;
      const payload = {
        empresa: form.empresa || null,
        cliente: form.cliente,
        evento: form.evento,
        fecha: form.fecha,
        validez: parseInt(form.validez, 10) || 15,
        presupuestoNro: form.presupuestoNro || null,
        formaPago: formaPagoLabel,
        total: totalCliente,
        items,
        estadoEvento,
        honorariosTipo,
        honorariosMonto,
        honorariosConcepto,
        cargasSocialesPct,
        impuestosPct,
      };
      const res = await fetch(presupuestoId ? `/api/presupuestos/${presupuestoId}` : "/api/presupuestos", {
        method: presupuestoId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error ?? `Error ${res.status}`);
      }
      const saved = await res.json();
      const listRes = await fetch("/api/presupuestos");
      const listData = await listRes.json().catch(() => []);
      setPresupuestos(Array.isArray(listData) ? listData : []);
      setPresupuestoId(saved.id);
      setMensaje("Presupuesto guardado correctamente.");
    } catch (err) {
      console.error(err);
      setMensaje(err instanceof Error ? err.message : "Error al guardar el presupuesto.");
    } finally {
      setGuardandoPresupuesto(false);
    }
  }

  async function crearEventoDesdePresupuesto() {
    if (!presupuestoId) {
      setMensaje("Primero guardá o seleccioná un presupuesto.");
      return;
    }
    setCreandoEvento(true);
    setMensaje("");
    try {
      await fetch(`/api/presupuestos/${presupuestoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estadoEvento }),
      });
      const res = await fetch(`/api/presupuestos/${presupuestoId}/crear-evento`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Error al crear evento");
      const evento = await res.json();
      router.push(`/eventos/${evento.id}`);
      router.refresh();
    } catch (err) {
      console.error(err);
      setMensaje("No se pudo crear el evento desde el presupuesto.");
    } finally {
      setCreandoEvento(false);
    }
  }

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        concepto: "",
        cantidad: 1,
        precioInterno: 0,
        precioCliente: 0,
      },
    ]);
  };

  const duplicateItem = (item: Item) => {
    setItems((prev) => [
      ...prev,
      { ...item, id: crypto.randomUUID(), concepto: `${item.concepto} (copia)`.trim() },
    ]);
  };

  const nuevoPresupuesto = () => {
    setPresupuestoId("");
    setForm({
      empresa: "",
      cliente: "",
      fecha: new Date().toISOString().slice(0, 10),
      validez: "15",
      presupuestoNro: "",
      formaPago: "TRANSFERENCIA",
      evento: "",
    });
    setItems([{ id: crypto.randomUUID(), concepto: "", cantidad: 1, precioInterno: 0, precioCliente: 0 }]);
    setHonorariosTipo("PORCENTAJE");
    setHonorariosMonto(15);
    setHonorariosConcepto("Honorarios HC");
    setCargasSocialesPct(0);
    setImpuestosPct(0);
    setEstadoEvento("BORRADOR");
    setMensaje("Nuevo presupuesto listo para completar.");
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateItem = (id: string, field: keyof Item, value: string | number) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, [field]: value } : i
      )
    );
  };

  const subtotalInterno = items.reduce((sum, i) => sum + i.cantidad * i.precioInterno, 0);
  const subtotalCliente = items.reduce((sum, i) => sum + i.cantidad * i.precioCliente, 0);

  const honorariosValor =
    honorariosTipo === "FIJO" ? honorariosMonto : subtotalCliente * (honorariosMonto / 100);

  const totalCliente = subtotalCliente + honorariosValor;

  const costoCargas = subtotalInterno * (cargasSocialesPct / 100);
  const costoImpuestos = subtotalInterno * (impuestosPct / 100);
  const totalInterno = subtotalInterno + costoCargas + costoImpuestos;

  const margenBruto = totalCliente - totalInterno;

  const formaPagoOptions = FORMA_PAGO_OPTIONS;
  const margenPct = totalCliente > 0 ? (margenBruto / totalCliente) * 100 : 0;
  const itemsCompletos = items.filter((item) => item.concepto.trim() && item.precioCliente > 0).length;
  const datosCompletos = [form.cliente, form.evento, form.fecha].filter(Boolean).length;

  async function generarPDF(modo: "cliente" | "interno") {
    setExporting(true);
    setShowPdfModal(false);
    // Dejar que el overlay se pinte antes del trabajo sincrónico de jsPDF (que bloquea el hilo).
    await new Promise((r) => setTimeout(r, 90));
    const startedAt = Date.now();
    try {
      const esInterno = modo === "interno";
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const PW = doc.internal.pageSize.getWidth();
      const PH = doc.internal.pageSize.getHeight();
      const M = 18;
      const R = PW - M;
      const CW = R - M;

      const fmt = (v: number) =>
        `$ ${v.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      const clip = (text: string, maxW: number, font: string = "normal") => {
        if (!text) return "—";
        doc.setFont("helvetica", font);
        if (doc.getTextWidth(text) <= maxW) return text;
        let t = text;
        while (t.length > 1 && doc.getTextWidth(t + "…") > maxW) t = t.slice(0, -1);
        return t + "…";
      };

      let pageNum = 1;

      const drawFooter = () => {
        const fy = PH - 14;
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.25);
        doc.line(M, fy, R, fy);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(140, 140, 140);
        const footerLabel = esInterno ? "DOCUMENTO INTERNO · NO ENVIAR AL CLIENTE" : "Presupuesto generado electrónicamente · Válido por el plazo indicado · Documento no vinculante hasta confirmación";
        doc.text(footerLabel, PW / 2, fy + 4, { align: "center" });
        doc.text(`Pág. ${pageNum}`, R, fy + 4, { align: "right" });
      };

      let y = 0;

      // ── HEADER (masthead minimalista, sin banda negra) ──
      const presupTitle = esInterno ? "PRESUPUESTO INTERNO" : "PRESUPUESTO";

      // Logotipo
      doc.setTextColor(22, 22, 22);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(25);
      doc.text("HC", M, 26);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(155, 155, 155);
      doc.setCharSpace(1.8);
      doc.text("HERMANAS CARADONTI", M, 32);
      doc.setCharSpace(0);

      // Bloque derecho: tipo de documento · número · fecha
      // Nota: con setCharSpace, align:"right" no cuenta el espaciado y se corta contra el borde.
      // Calculamos el ancho real (incluyendo el letter-spacing) y anclamos a la izquierda.
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(155, 155, 155);
      doc.setCharSpace(2);
      const presupW = doc.getTextWidth(presupTitle) + 2 * presupTitle.length;
      doc.text(presupTitle, R - presupW, 20);
      doc.setCharSpace(0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(22, 22, 22);
      doc.text(`N° ${form.presupuestoNro || "—"}`, R, 27, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(120, 120, 120);
      doc.text(form.fecha || "—", R, 32.5, { align: "right" });

      // Regla del header
      doc.setDrawColor(212, 212, 212);
      doc.setLineWidth(0.4);
      doc.line(M, 40, R, 40);

      // ── DATOS DEL PRESUPUESTO ──
      y = 53;
      const col1X = M;
      const col2X = M + CW * 0.52;
      const col1W = CW * 0.46;
      const col2W = CW * 0.46;
      const rowGap = 15;

      const drawField = (label: string, value: string, x: number, maxW: number, atY: number) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(150, 150, 150);
        doc.setCharSpace(0.8);
        doc.text(label.toUpperCase(), x, atY);
        doc.setCharSpace(0);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        doc.setTextColor(28, 28, 28);
        doc.text(clip(value || "—", maxW, "bold"), x, atY + 5.5);
      };

      drawField("Empresa", form.empresa || "—", col1X, col1W, y);
      drawField("Cliente", form.cliente || "—", col2X, col2W, y);
      y += rowGap;
      drawField("Evento", form.evento || "—", col1X, col1W, y);
      drawField("Validez", `${form.validez} días`, col2X, col2W, y);
      y += rowGap;
      const fpLabel = formaPagoOptions.find((o) => o.value === form.formaPago)?.label ?? form.formaPago;
      drawField("Forma de pago", fpLabel || "—", col1X, CW, y);

      y += rowGap + 6;

      // ── TABLA DE ITEMS ──
      const tableBottom = PH - 24;
      const rowH = 9.5;

      let colConceptoX: number, colCantX: number, colInternoX: number, colClienteX: number, colSubtX: number, conceptoW: number;

      if (esInterno) {
        colConceptoX = M + 2;
        colCantX = M + CW * 0.42;
        colInternoX = M + CW * 0.58;
        colClienteX = M + CW * 0.76;
        colSubtX = R - 2;
        conceptoW = colCantX - colConceptoX - 4;
      } else {
        colConceptoX = M + 2;
        colCantX = M + CW * 0.58;
        colInternoX = 0;
        colClienteX = M + CW * 0.76;
        colSubtX = R - 2;
        conceptoW = colCantX - colConceptoX - 6;
      }

      const drawTableHeader = () => {
        doc.setDrawColor(30, 30, 30);
        doc.setLineWidth(0.5);
        doc.line(M, y, R, y);
        y += 5;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(135, 135, 135);
        doc.setCharSpace(0.6);
        doc.text("CONCEPTO", colConceptoX, y);
        doc.text("CANT.", colCantX, y, { align: "right" });
        if (esInterno) {
          doc.text("P. INTERNO", colInternoX, y, { align: "right" });
          doc.text("P. CLIENTE", colClienteX, y, { align: "right" });
        } else {
          doc.text("P. UNITARIO", colClienteX, y, { align: "right" });
        }
        doc.text("SUBTOTAL", colSubtX, y, { align: "right" });
        doc.setCharSpace(0);
        y += 3.5;
        doc.setDrawColor(226, 226, 226);
        doc.setLineWidth(0.3);
        doc.line(M, y, R, y);
        y += 7;
      };

      drawTableHeader();

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const sub = item.cantidad * item.precioCliente;

        if (y + rowH > tableBottom) {
          drawFooter();
          doc.addPage();
          pageNum++;
          y = 16;
          drawTableHeader();
        }

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(40, 40, 40);
        doc.text(clip(item.concepto || "—", conceptoW), colConceptoX, y + 5.5);
        doc.setTextColor(95, 95, 95);
        doc.text(String(item.cantidad), colCantX, y + 5.5, { align: "right" });
        if (esInterno) {
          doc.setTextColor(150, 150, 150);
          doc.text(fmt(item.precioInterno), colInternoX, y + 5.5, { align: "right" });
        }
        doc.setTextColor(95, 95, 95);
        doc.text(fmt(item.precioCliente), colClienteX, y + 5.5, { align: "right" });
        doc.setFont("helvetica", "bold");
        doc.setTextColor(28, 28, 28);
        doc.text(fmt(sub), colSubtX, y + 5.5, { align: "right" });
        y += rowH;
        doc.setDrawColor(237, 237, 237);
        doc.setLineWidth(0.2);
        doc.line(M, y, R, y);
      }

      // ── Honorarios row ──
      if (honorariosValor > 0) {
        if (y + rowH > tableBottom) {
          drawFooter();
          doc.addPage();
          pageNum++;
          y = 16;
          drawTableHeader();
        }
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        doc.setTextColor(70, 70, 70);
        const honLabel = honorariosTipo === "PORCENTAJE"
          ? `${honorariosConcepto} (${honorariosMonto}%)`
          : honorariosConcepto;
        doc.text(clip(honLabel, conceptoW, "normal"), colConceptoX, y + 5.5);
        doc.text("1", colCantX, y + 5.5, { align: "right" });
        if (esInterno) {
          doc.setTextColor(150, 150, 150);
          doc.text("—", colInternoX, y + 5.5, { align: "right" });
          doc.setTextColor(70, 70, 70);
        }
        doc.text(fmt(honorariosValor), colClienteX, y + 5.5, { align: "right" });
        doc.setFont("helvetica", "bold");
        doc.setTextColor(28, 28, 28);
        doc.text(fmt(honorariosValor), colSubtX, y + 5.5, { align: "right" });
        y += rowH;
        doc.setDrawColor(237, 237, 237);
        doc.setLineWidth(0.2);
        doc.line(M, y, R, y);
      }

      // ── Línea inferior de tabla ──
      doc.setDrawColor(30, 30, 30);
      doc.setLineWidth(0.4);
      doc.line(M, y + 1, R, y + 1);
      y += 6;

      // ── Subtotal + Honorarios + TOTAL ──
      const footerBlockH = (honorariosValor > 0 ? 36 : 20) + (esInterno ? 30 : 0);
      if (y + footerBlockH > tableBottom) {
        drawFooter();
        doc.addPage();
        pageNum++;
        y = 20;
      }

      const totalW = 86;
      const totalX = R - totalW;

      if (honorariosValor > 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(115, 115, 115);
        doc.text("Subtotal ítems", totalX, y + 4);
        doc.text(fmt(subtotalCliente), R - 2, y + 4, { align: "right" });
        y += 7;
        doc.text(honorariosConcepto, totalX, y + 4);
        doc.text(fmt(honorariosValor), R - 2, y + 4, { align: "right" });
        y += 9;
      }

      // TOTAL — tratamiento elegante, sin caja negra
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(totalX, y, totalW, 15, 2, 2, "F");
      doc.setDrawColor(24, 24, 24);
      doc.setLineWidth(0.6);
      doc.line(totalX, y, totalX + totalW, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.setCharSpace(1.2);
      doc.text("TOTAL", totalX + 6, y + 9.5);
      doc.setCharSpace(0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(22, 22, 22);
      doc.text(fmt(totalCliente), R - 6, y + 9.7, { align: "right" });
      y += 22;

      // ── Bloque interno: costos y margen ──
      if (esInterno) {
        if (y + 32 > tableBottom) {
          drawFooter();
          doc.addPage();
          pageNum++;
          y = 20;
        }

        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.3);
        doc.line(M, y, R, y);
        y += 6;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        doc.text("ANÁLISIS INTERNO", M, y + 4);
        y += 10;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(60, 60, 60);

        const drawLine = (label: string, value: number) => {
          doc.text(label, M + 2, y + 4);
          doc.text(fmt(value), R - 2, y + 4, { align: "right" });
          y += 7;
        };

        drawLine("Costo interno (ítems)", subtotalInterno);
        if (costoCargas > 0) drawLine(`Cargas sociales (${cargasSocialesPct}%)`, costoCargas);
        if (costoImpuestos > 0) drawLine(`Impuestos (${impuestosPct}%)`, costoImpuestos);
        drawLine("Total costo", totalInterno);

        y += 3;

        const margenW = 86;
        const margenX = R - margenW;
        const mr = margenBruto >= 0 ? 16 : 190;
        const mg = margenBruto >= 0 ? 122 : 40;
        const mb = margenBruto >= 0 ? 90 : 40;
        doc.setFillColor(245, 245, 245);
        doc.roundedRect(margenX, y, margenW, 15, 2, 2, "F");
        doc.setDrawColor(mr, mg, mb);
        doc.setLineWidth(0.6);
        doc.line(margenX, y, margenX + margenW, y);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.setCharSpace(1.2);
        doc.text("MARGEN", margenX + 6, y + 9.5);
        doc.setCharSpace(0);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.setTextColor(mr, mg, mb);
        doc.text(fmt(margenBruto), R - 6, y + 9.7, { align: "right" });
      }

      // ── TÉRMINOS Y CONDICIONES (solo PDF Cliente) ──
      if (!esInterno) {
        const lh = 4.5;
        const ensure = (needed: number) => {
          if (y + needed > PH - 18) {
            drawFooter();
            doc.addPage();
            pageNum++;
            y = 20;
          }
        };
        const sectionTitle = (t: string) => {
          ensure(11);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.8);
          doc.setTextColor(20, 20, 20);
          doc.text(t, M, y);
          y += lh + 2;
        };
        const paragraph = (t: string, italic = false) => {
          doc.setFont("helvetica", italic ? "italic" : "normal");
          doc.setFontSize(8);
          doc.setTextColor(70, 70, 70);
          for (const line of doc.splitTextToSize(t, CW) as string[]) {
            ensure(lh);
            doc.text(line, M, y);
            y += lh;
          }
        };
        const bullet = (t: string) => {
          doc.setFontSize(8);
          const lines = doc.splitTextToSize(t, CW - 6) as string[];
          lines.forEach((line, idx) => {
            ensure(lh);
            if (idx === 0) {
              doc.setFont("helvetica", "bold");
              doc.setTextColor(150, 150, 150);
              doc.text("•", M + 1.5, y);
            }
            doc.setFont("helvetica", "normal");
            doc.setTextColor(70, 70, 70);
            doc.text(line, M + 6, y);
            y += lh;
          });
        };

        // Nueva página dedicada a los términos
        drawFooter();
        doc.addPage();
        pageNum++;
        y = 22;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.setTextColor(20, 20, 20);
        doc.text("Términos y condiciones", M, y);
        y += 3;
        doc.setDrawColor(30, 30, 30);
        doc.setLineWidth(0.5);
        doc.line(M, y, R, y);
        y += 9;

        sectionTitle("NOTA IMPORTANTE");
        bullet("En el caso de posponerse la fecha, los precios se actualizarán al día de la nueva fecha.");
        bullet("El presupuesto tiene validez por 10 días hábiles.");
        bullet("Este presupuesto tiene un fin orientativo, quedando el presupuesto definitivo sujeto a las eventuales variaciones de los precios del mercado al momento del pago final.");
        bullet("El presupuesto definitivo se actualiza por IPC, y será presentado 10 días antes del evento.");
        y += 3;

        sectionTitle("Condiciones de pago");
        bullet("Adelanto: 30% del presupuesto inicial, para reservar mobiliario y la fecha.");
        bullet("Saldo: 7 días hábiles antes del día de armado.");
        y += 3;

        sectionTitle("Todos los elementos del presupuesto son a modo de ALQUILER");
        bullet("El presupuesto incluye la provisión de flores y floreros, muebles y objetos, montaje y gastos de envío.");
        bullet("La reserva de fecha y mobiliario se efectúa mediante el pago del 30% del presupuesto inicial.");
        bullet("Se deberá dejar, antes de la fecha de entrega prevista, un cheque de $2.000.000 en concepto de garantía.");
        bullet("Los muebles y objetos deben ser devueltos en las mismas condiciones; en caso de robo o rotura de los objetos alquilados, la reposición correrá por cuenta del cliente.");
        bullet("Si el evento se suspendiera, pospusiera o cancelara por cualquier motivo no imputable a HERMANAS CARADONTI, el anticipo no será reembolsable.");
        y += 4;

        paragraph(
          "\"A los efectos del presente presupuesto se declara que el mismo incluye el cumplimiento de la totalidad de las habilitaciones locales requeridas, así como la utilización de material debidamente tratado y autorizado conforme las regulaciones nacionales, provinciales y municipales específicas. Asimismo, contempla el total cumplimiento de las obligaciones laborales, previsionales y de riesgo del trabajo del personal a cargo de la empresa.\"",
          true
        );
        y += 6;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.2);
        doc.setTextColor(40, 40, 40);
        ensure(8);
        doc.text("Habiendo sido notificado de las condiciones de pago, acepto las mismas.", M, y);

        // Línea de firma al pie
        ensure(40);
        const sy = PH - 38;
        const colGap = 10;
        const colW = (CW - 2 * colGap) / 3;
        const cols = ["Firma", "Aclaración", "DNI"];
        doc.setDrawColor(120, 120, 120);
        doc.setLineWidth(0.3);
        cols.forEach((label, i) => {
          const cx = M + i * (colW + colGap);
          doc.line(cx, sy, cx + colW, sy);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(90, 90, 90);
          doc.text(label, cx, sy + 5);
        });
      }

      // ── FOOTER ──
      drawFooter();

      const suffix = esInterno ? "interno" : "cliente";
      doc.save(`presupuesto-HC-${form.presupuestoNro || "sin-numero"}-${form.fecha}-${suffix}.pdf`);
    } catch (err) {
      console.error(err);
    } finally {
      // Mantener el overlay un mínimo para que la animación se perciba.
      const elapsed = Date.now() - startedAt;
      const minDuration = 1100;
      if (elapsed < minDuration) {
        await new Promise((r) => setTimeout(r, minDuration - elapsed));
      }
      setExporting(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 hover:border-neutral-300 focus:border-sky-500 focus:ring-4 focus:ring-sky-100";
  const labelClass = "mb-1.5 block text-xs font-semibold text-neutral-600";

  return (
    <div className="space-y-6">
      {/* Barra de presupuestos guardados — acceso rápido, fuera del Paso 1 */}
      <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 sm:max-w-md sm:flex-1">
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Presupuesto guardado</label>
          <Select
            value={presupuestoId}
            onChange={(v) => {
              if (!v) {
                nuevoPresupuesto();
                return;
              }
              cargarPresupuesto(v);
            }}
            options={[
              { value: "", label: "Nuevo presupuesto..." },
              ...presupuestos.map((p) => ({
                value: p.id,
                label: `${p.presupuestoNro ? `#${p.presupuestoNro} · ` : ""}${p.evento} (${new Date(
                  p.fecha
                ).toLocaleDateString("es-AR")})`,
              })),
            ]}
            placeholder="Seleccionar presupuesto..."
          />
        </div>
        <button
          type="button"
          onClick={nuevoPresupuesto}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:border-neutral-300 hover:bg-neutral-50"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 5v14M5 12h14" />
          </svg>
          Nuevo presupuesto
        </button>
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
      {/* Formulario */}
      <div className="min-w-0 space-y-5">
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-100 px-5 py-4 sm:px-6">
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-600">Paso 1</p>
            <h2 className="text-lg font-semibold tracking-tight text-neutral-900">
              Datos del presupuesto
            </h2>
            <p className="mt-1 text-sm text-neutral-500">Identificá al cliente y definí las condiciones comerciales · {datosCompletos}/3 datos esenciales.</p>
          </div>
          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
            <div className="sm:col-span-2">
              <label className={labelClass}>Empresa / Organizadora</label>
              <input
                type="text"
                value={form.empresa}
                onChange={(e) => setForm({ ...form, empresa: e.target.value })}
                placeholder="Nombre de la empresa"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Cliente</label>
              <input
                type="text"
                value={form.cliente}
                onChange={(e) => setForm({ ...form, cliente: e.target.value })}
                placeholder="Nombre del cliente"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Evento / Concepto</label>
              <input
                type="text"
                value={form.evento}
                onChange={(e) => setForm({ ...form, evento: e.target.value })}
                placeholder="Ej: Boda, Fiesta corporativa"
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 sm:col-span-2">
              <div>
                <label className={labelClass}>Fecha</label>
                <input
                  type="date"
                  value={form.fecha}
                  onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Presupuesto Nº</label>
                <input
                  type="text"
                  value={form.presupuestoNro}
                  onChange={(e) => setForm({ ...form, presupuestoNro: e.target.value })}
                  placeholder="Ej: 001"
                  className={inputClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:col-span-2">
              <div>
                <label className={labelClass}>Validez (días)</label>
                <input
                  type="text"
                  value={form.validez}
                  onChange={(e) => setForm({ ...form, validez: e.target.value })}
                  placeholder="15"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Forma de pago</label>
                <Select
                  value={form.formaPago}
                  onChange={(v) => setForm({ ...form, formaPago: v })}
                  options={formaPagoOptions}
                />
              </div>
            </div>
            <div className="space-y-3 border-t border-neutral-100 pt-5 sm:col-span-2">
              <div>
                <label className={labelClass}>Estado del evento a crear</label>
                <Select
                  value={estadoEvento}
                  onChange={setEstadoEvento}
                  options={[
                    { value: "BORRADOR", label: "Standby" },
                    { value: "CONFIRMADO", label: "Confirmación" },
                    { value: "EN_CURSO", label: "Activo" },
                  ]}
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={guardarPresupuesto}
                  disabled={guardandoPresupuesto}
                  className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg text-sm transition-colors flex items-center gap-2"
                >
                  {guardandoPresupuesto ? <LoadingSpinner className="h-4 w-4 text-white" /> : null}
                  {guardandoPresupuesto ? "Guardando..." : presupuestoId ? "Actualizar presupuesto" : "Guardar presupuesto"}
                </button>
                <button
                  type="button"
                  onClick={crearEventoDesdePresupuesto}
                  disabled={!presupuestoId || creandoEvento}
                  className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg text-sm transition-colors flex items-center gap-2"
                >
                  {creandoEvento ? <LoadingSpinner className="h-4 w-4 text-white" /> : null}
                  {creandoEvento ? "Creando evento..." : "Crear evento desde presupuesto"}
                </button>
              </div>
              {mensaje ? <p className="text-neutral-500 text-xs">{mensaje}</p> : null}
            </div>
          </div>
        </div>

        {/* Ítems */}
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4 sm:px-6">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-600">Paso 2</p>
              <h2 className="text-lg font-semibold tracking-tight text-neutral-900">
              Ítems del presupuesto
              </h2>
              <p className="mt-1 text-sm text-neutral-500">Cargá costos y precios; el margen se actualiza automáticamente · {itemsCompletos}/{items.length} partidas completas.</p>
            </div>
            <button
              type="button"
              onClick={addItem}
              className="rounded-xl bg-neutral-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-neutral-800"
            >
              + Agregar ítem
            </button>
          </div>
          <div className="space-y-3 p-4 sm:p-6">
            <div className="overflow-x-auto pb-2">
            <div className="min-w-[760px] space-y-3">
            <div className="grid grid-cols-[28px_minmax(200px,1fr)_64px_110px_110px_110px_62px] gap-2 px-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              <div>#</div>
              <div>Concepto</div>
              <div>Cant.</div>
              <div>Costo unit.</div>
              <div>Precio unit.</div>
              <div className="text-right">Subtotal</div>
              <div />
            </div>
            {items.map((item, idx) => (
              <div key={item.id} className="grid grid-cols-[28px_minmax(200px,1fr)_64px_110px_110px_110px_62px] items-center gap-2 rounded-xl border border-neutral-100 bg-neutral-50/70 p-2">
                <div className="text-neutral-400 text-xs tabular-nums">{idx + 1}</div>
                <div>
                  <input
                    type="text"
                    value={item.concepto}
                    onChange={(e) => updateItem(item.id, "concepto", e.target.value)}
                    placeholder="Descripción"
                    className={inputClass}
                  />
                </div>
                <div>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={item.cantidad || ""}
                    onChange={(e) => updateItem(item.id, "cantidad", parseFloat(e.target.value) || 0)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={item.precioInterno || ""}
                    onChange={(e) =>
                      updateItem(item.id, "precioInterno", parseFloat(e.target.value) || 0)
                    }
                    placeholder="Costo"
                    className={inputClass}
                  />
                </div>
                <div>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={item.precioCliente || ""}
                    onChange={(e) =>
                      updateItem(item.id, "precioCliente", parseFloat(e.target.value) || 0)
                    }
                    placeholder="Cliente"
                    className={inputClass}
                  />
                </div>
                <div className="text-right text-sm font-bold tabular-nums text-neutral-800">
                  {formatMoney(item.cantidad * item.precioCliente)}
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => duplicateItem(item)}
                    className="p-1 text-neutral-400 transition hover:text-sky-600"
                    title="Duplicar"
                    aria-label={`Duplicar ítem ${idx + 1}`}
                  >
                    ⧉
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    disabled={items.length <= 1}
                    className="p-1 text-neutral-400 transition hover:text-rose-600 disabled:opacity-30"
                    title="Eliminar"
                    aria-label={`Eliminar ítem ${idx + 1}`}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
            </div>
            </div>
            <div className="pt-4 border-t border-neutral-200 space-y-1">
              <div className="flex justify-between text-xs text-neutral-500">
                <span>Subtotal interno</span>
                <span className="tabular-nums">${subtotalInterno.toLocaleString("es-AR")}</span>
              </div>
              <div className="flex justify-between text-xs text-neutral-500">
                <span>Subtotal cliente</span>
                <span className="tabular-nums">${subtotalCliente.toLocaleString("es-AR")}</span>
              </div>
              {honorariosValor > 0 && (
                <div className="flex justify-between text-xs text-neutral-500">
                  <span>Honorarios</span>
                  <span className="tabular-nums">${honorariosValor.toLocaleString("es-AR")}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-semibold text-neutral-900 pt-1">
                <span>Total cliente</span>
                <span className="tabular-nums">${totalCliente.toLocaleString("es-AR")}</span>
              </div>
              {margenBruto !== 0 && (
                <div className={`flex justify-between text-xs font-medium pt-1 ${margenBruto >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  <span>Margen bruto</span>
                  <span className="tabular-nums">${margenBruto.toLocaleString("es-AR")}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Honorarios */}
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-100 px-5 py-4 sm:px-6">
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-600">Paso 3</p>
            <h2 className="text-lg font-semibold tracking-tight text-neutral-900">
              Honorarios
            </h2>
            <p className="mt-1 text-sm text-neutral-500">Definí el adicional comercial sobre las partidas.</p>
          </div>
          <div className="space-y-4 p-5 sm:p-6">
            <div>
              <label className={labelClass}>Concepto</label>
              <input
                type="text"
                value={honorariosConcepto}
                onChange={(e) => setHonorariosConcepto(e.target.value)}
                placeholder="Ej: Honorarios HC"
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Tipo de cobro</label>
                <Select
                  value={honorariosTipo}
                  onChange={(v) => setHonorariosTipo(v as "FIJO" | "PORCENTAJE")}
                  options={[
                    { value: "PORCENTAJE", label: "% del subtotal" },
                    { value: "FIJO", label: "Monto fijo" },
                  ]}
                />
              </div>
              <div>
                <label className={labelClass}>
                  {honorariosTipo === "PORCENTAJE" ? "Porcentaje (%)" : "Monto ($)"}
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={honorariosMonto || ""}
                  onChange={(e) => setHonorariosMonto(parseFloat(e.target.value) || 0)}
                  placeholder={honorariosTipo === "PORCENTAJE" ? "15" : "0"}
                  className={inputClass}
                />
              </div>
            </div>
            {honorariosValor > 0 && (
              <div className="text-xs text-neutral-500 bg-neutral-50 rounded-lg px-3 py-2">
                Honorarios calculados: <span className="font-semibold text-neutral-700">${honorariosValor.toLocaleString("es-AR")}</span>
              </div>
            )}
          </div>
        </div>

        {/* Cargas Sociales e Impuestos */}
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-100 px-5 py-4 sm:px-6">
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-600">Paso 4</p>
            <h2 className="text-lg font-semibold tracking-tight text-neutral-900">
              Cargas sociales e impuestos
            </h2>
            <p className="mt-1 text-sm text-neutral-500">Ajustá el costo interno real sin modificar el precio al cliente.</p>
          </div>
          <div className="space-y-4 p-5 sm:p-6">
            <p className="text-xs text-neutral-500">
              Estos porcentajes se aplican sobre el costo interno para estimar el costo real del evento.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Cargas sociales (%)</label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={cargasSocialesPct || ""}
                  onChange={(e) => setCargasSocialesPct(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Impuestos (%)</label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={impuestosPct || ""}
                  onChange={(e) => setImpuestosPct(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className={inputClass}
                />
              </div>
            </div>
            <div className="text-xs text-neutral-500 bg-neutral-50 rounded-lg px-3 py-2 space-y-1">
              {costoCargas > 0 && (
                <div className="flex justify-between">
                  <span>Cargas sociales ({cargasSocialesPct}%)</span>
                  <span className="font-semibold text-neutral-700">${costoCargas.toLocaleString("es-AR")}</span>
                </div>
              )}
              {costoImpuestos > 0 && (
                <div className="flex justify-between">
                  <span>Impuestos ({impuestosPct}%)</span>
                  <span className="font-semibold text-neutral-700">${costoImpuestos.toLocaleString("es-AR")}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-neutral-700 pt-1 border-t border-neutral-200">
                <span>Costo interno total</span>
                <span>${totalInterno.toLocaleString("es-AR")}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowPdfModal(true)}
            disabled={exporting}
            className="w-full py-3 px-4 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-70 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {exporting ? <LoadingSpinner className="h-5 w-5 text-white" /> : null}
            {exporting ? "Generando PDF..." : "Exportar a PDF"}
          </button>

        </div>

        {mounted && showPdfModal &&
          createPortal(
            <div
              className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
              onClick={() => setShowPdfModal(false)}
            >
              <div
                className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="border-b border-neutral-200 px-6 py-4">
                  <h3 className="text-base font-semibold text-neutral-900">Exportar presupuesto</h3>
                  <p className="mt-1 text-xs text-neutral-500">Seleccioná el tipo de PDF a generar</p>
                </div>
                <div className="space-y-3 p-6">
                  <button
                    type="button"
                    onClick={() => generarPDF("cliente")}
                    className="flex w-full items-center gap-3 rounded-xl bg-neutral-900 px-4 py-3 text-left text-sm font-medium text-white transition-colors hover:bg-neutral-800"
                  >
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/10 text-base">
                      C
                    </span>
                    <span>
                      <span className="block font-semibold">PDF Cliente</span>
                      <span className="block text-xs font-normal text-neutral-300">Solo precios al cliente, para enviar</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => generarPDF("interno")}
                    className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-100 px-4 py-3 text-left text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-200"
                  >
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-neutral-900/10 text-base">
                      I
                    </span>
                    <span>
                      <span className="block font-semibold">PDF Interno</span>
                      <span className="block text-xs font-normal text-neutral-500">Costos, márgenes y análisis completo</span>
                    </span>
                  </button>
                </div>
                <div className="border-t border-neutral-100 px-6 py-3">
                  <button
                    type="button"
                    onClick={() => setShowPdfModal(false)}
                    className="w-full py-2 text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-700"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

        {mounted && exporting && createPortal(<PdfLoadingOverlay />, document.body)}
      </div>

      {/* Vista previa — FIX: tabla con subtotal por fila */}
      <div className="xl:sticky xl:top-24">
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-lg shadow-neutral-200/60">
          <div className="bg-neutral-950 px-5 py-5 text-white">
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-300">Resumen en vivo</p>
            <h2 className="text-lg font-semibold tracking-tight">
              Vista previa
            </h2>
            <div className="mt-4 flex items-end justify-between gap-3">
              <div><p className="text-xs text-neutral-400">Total al cliente</p><p className="mt-1 text-2xl font-bold tabular-nums">{formatMoney(totalCliente)}</p></div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${margenBruto >= 0 ? "bg-emerald-400/15 text-emerald-300" : "bg-rose-400/15 text-rose-300"}`}>{margenPct.toFixed(1)}%</span>
            </div>
          </div>
          <div className="p-5 space-y-4 text-sm">
            <div>
              <p className="text-neutral-500 text-xs font-medium uppercase mb-1">Empresa</p>
              <p className="font-semibold text-neutral-900">{form.empresa || "—"}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-neutral-500 text-xs font-medium uppercase mb-1">Cliente</p>
                <p className="font-medium text-neutral-900">{form.cliente || "—"}</p>
              </div>
              <div>
                <p className="text-neutral-500 text-xs font-medium uppercase mb-1">Fecha</p>
                <p className="text-neutral-900">{form.fecha || "—"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-neutral-500 text-xs font-medium uppercase mb-1">Evento</p>
                <p className="text-neutral-900">{form.evento || "—"}</p>
              </div>
              <div>
                <p className="text-neutral-500 text-xs font-medium uppercase mb-1">Presupuesto Nº</p>
                <p className="font-medium text-neutral-900">{form.presupuestoNro || "—"}</p>
              </div>
            </div>
            <div className="border-t border-neutral-200 pt-4 mt-2">
              <div className="grid grid-cols-[1fr_40px_64px_64px_72px] gap-1 text-xs font-medium text-neutral-400 uppercase mb-2">
                <div>Concepto</div>
                <div className="text-right">Cant.</div>
                <div className="text-right">Interno</div>
                <div className="text-right">Cliente</div>
                <div className="text-right">Subtotal</div>
              </div>
              <div className="space-y-1 max-h-56 overflow-y-auto">
                {items.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`grid grid-cols-[1fr_40px_64px_64px_72px] gap-1 text-xs py-1.5 rounded ${
                      idx % 2 === 1 ? "bg-neutral-50" : ""
                    }`}
                  >
                    <div className="text-neutral-700 truncate pl-1">
                      {item.concepto || "—"}
                    </div>
                    <div className="text-right text-neutral-500 tabular-nums">
                      {item.cantidad}
                    </div>
                    <div className="text-right text-neutral-400 tabular-nums">
                      ${item.precioInterno.toLocaleString("es-AR")}
                    </div>
                    <div className="text-right text-neutral-500 tabular-nums">
                      ${item.precioCliente.toLocaleString("es-AR")}
                    </div>
                    <div className="text-right font-medium text-neutral-800 tabular-nums pr-1">
                      ${(item.cantidad * item.precioCliente).toLocaleString("es-AR")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {honorariosValor > 0 && (
              <div className="flex justify-between text-xs text-neutral-500 pt-2">
                <span>{honorariosConcepto}</span>
                <span className="tabular-nums font-medium">${honorariosValor.toLocaleString("es-AR")}</span>
              </div>
            )}
            <div className="border-t border-neutral-200 pt-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Total cliente</span>
                <span className="text-base font-bold text-neutral-900 tabular-nums">
                  ${totalCliente.toLocaleString("es-AR")}
                </span>
              </div>
              {totalInterno > 0 && (
                <div className="flex justify-between items-center text-xs text-neutral-400">
                  <span>Costo interno</span>
                  <span className="tabular-nums">${totalInterno.toLocaleString("es-AR")}</span>
                </div>
              )}
              {margenBruto !== 0 && (
                <div className={`flex justify-between items-center text-xs font-medium ${margenBruto >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  <span>Margen</span>
                  <span className="tabular-nums">${margenBruto.toLocaleString("es-AR")}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
