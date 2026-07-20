"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { jsPDF } from "jspdf";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Select } from "@/components/ui/select";

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

  function generarPDF(modo: "cliente" | "interno") {
    setExporting(true);
    setShowPdfModal(false);
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

      // ── HEADER ──
      doc.setFillColor(15, 15, 15);
      doc.rect(0, 0, PW, 36, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("HC", M, 22);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setCharSpace(2.5);
      const presupTitle = esInterno ? "PRESUPUESTO INTERNO" : "PRESUPUESTO";
      const presupW = doc.getTextWidth(presupTitle) + 2.5 * (presupTitle.length - 1);
      doc.text(presupTitle, R - presupW, 22);
      doc.setCharSpace(0);

      // ── DATOS SUPERIORES (grilla 2×3) ──
      y = 46;
      const col1X = M;
      const col2X = M + CW * 0.52;
      const col1W = CW * 0.48;
      const col2W = CW * 0.44;
      const rowGap = 14;

      const drawField = (label: string, value: string, x: number, maxW: number, atY: number) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(130, 130, 130);
        doc.text(label.toUpperCase(), x, atY);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(20, 20, 20);
        doc.text(clip(value || "—", maxW, "bold"), x, atY + 5);
      };

      drawField("Empresa", form.empresa || "—", col1X, col1W, y);
      drawField("Presupuesto Nro.", form.presupuestoNro || "—", col2X, col2W, y);
      y += rowGap;
      drawField("Cliente", form.cliente || "—", col1X, col1W, y);
      drawField("Fecha", form.fecha || "—", col2X, col2W, y);
      y += rowGap;
      drawField("Evento", form.evento || "—", col1X, col1W, y);
      drawField("Validez", `${form.validez} días`, col2X, col2W, y);
      y += rowGap;
      const fpLabel = formaPagoOptions.find((o) => o.value === form.formaPago)?.label ?? form.formaPago;
      drawField("Forma de pago", fpLabel || "—", col1X, CW, y);

      y += rowGap + 2;

      // ── SEPARADOR ──
      doc.setDrawColor(30, 30, 30);
      doc.setLineWidth(0.5);
      doc.line(M, y, R, y);
      y += 8;

      // ── TABLA DE ITEMS ──
      const tableBottom = PH - 24;
      const rowH = 8;

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
        doc.setFillColor(235, 235, 235);
        doc.roundedRect(M, y, CW, 8, 1, 1, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(60, 60, 60);
        doc.text("CONCEPTO", colConceptoX, y + 5.5);
        doc.text("CANT.", colCantX, y + 5.5, { align: "right" });
        if (esInterno) {
          doc.text("P. INTERNO", colInternoX, y + 5.5, { align: "right" });
          doc.text("P. CLIENTE", colClienteX, y + 5.5, { align: "right" });
        } else {
          doc.text("P. UNITARIO", colClienteX, y + 5.5, { align: "right" });
        }
        doc.text("SUBTOTAL", colSubtX, y + 5.5, { align: "right" });
        y += 10;
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

        if (i % 2 === 0) {
          doc.setFillColor(248, 248, 248);
          doc.rect(M, y - 1, CW, rowH, "F");
        }

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(30, 30, 30);
        doc.text(clip(item.concepto || "—", conceptoW), colConceptoX, y + 5);
        doc.text(String(item.cantidad), colCantX, y + 5, { align: "right" });
        if (esInterno) {
          doc.setTextColor(100, 100, 100);
          doc.text(fmt(item.precioInterno), colInternoX, y + 5, { align: "right" });
          doc.setTextColor(30, 30, 30);
        }
        doc.text(fmt(item.precioCliente), colClienteX, y + 5, { align: "right" });
        doc.setFont("helvetica", "bold");
        doc.text(fmt(sub), colSubtX, y + 5, { align: "right" });
        y += rowH;
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
        doc.setFillColor(240, 240, 240);
        doc.rect(M, y - 1, CW, rowH, "F");
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8.5);
        doc.setTextColor(30, 30, 30);
        const honLabel = honorariosTipo === "PORCENTAJE"
          ? `${honorariosConcepto} (${honorariosMonto}%)`
          : honorariosConcepto;
        doc.text(clip(honLabel, conceptoW, "normal"), colConceptoX, y + 5);
        doc.text("1", colCantX, y + 5, { align: "right" });
        if (esInterno) {
          doc.setTextColor(100, 100, 100);
          doc.text("—", colInternoX, y + 5, { align: "right" });
          doc.setTextColor(30, 30, 30);
        }
        doc.text(fmt(honorariosValor), colClienteX, y + 5, { align: "right" });
        doc.setFont("helvetica", "bold");
        doc.text(fmt(honorariosValor), colSubtX, y + 5, { align: "right" });
        y += rowH;
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

      if (honorariosValor > 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(80, 80, 80);
        doc.text("Subtotal ítems:", R - 72, y + 4);
        doc.text(fmt(subtotalCliente), R - 2, y + 4, { align: "right" });
        y += 7;
        doc.text(`${honorariosConcepto}:`, R - 72, y + 4);
        doc.text(fmt(honorariosValor), R - 2, y + 4, { align: "right" });
        y += 9;
      }

      const totalBoxW = 72;
      const totalBoxX = R - totalBoxW;
      doc.setFillColor(15, 15, 15);
      doc.roundedRect(totalBoxX, y, totalBoxW, 14, 2, 2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("TOTAL", totalBoxX + 6, y + 9);
      doc.setFontSize(11);
      doc.text(fmt(totalCliente), R - 4, y + 9, { align: "right" });
      y += 20;

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

        y += 2;
        doc.setDrawColor(30, 30, 30);
        doc.setLineWidth(0.3);
        doc.line(R - 72, y, R, y);
        y += 2;

        const margenBoxW = 72;
        const margenBoxX = R - margenBoxW;
        doc.setFillColor(margenBruto >= 0 ? 20 : 180, margenBruto >= 0 ? 20 : 30, margenBruto >= 0 ? 20 : 30);
        doc.roundedRect(margenBoxX, y, margenBoxW, 14, 2, 2, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text("MARGEN", margenBoxX + 6, y + 9);
        doc.setFontSize(11);
        doc.text(fmt(margenBruto), R - 4, y + 9, { align: "right" });
      }

      // ── FOOTER ──
      drawFooter();

      const suffix = esInterno ? "interno" : "cliente";
      doc.save(`presupuesto-HC-${form.presupuestoNro || "sin-numero"}-${form.fecha}-${suffix}.pdf`);
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 hover:border-neutral-300 focus:border-sky-500 focus:ring-4 focus:ring-sky-100";
  const labelClass = "mb-1.5 block text-xs font-semibold text-neutral-600";

  return (
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
                <label className={labelClass}>Presupuestos guardados</label>
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

          {showPdfModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
                <div className="px-6 py-4 border-b border-neutral-200">
                  <h3 className="text-base font-semibold text-neutral-900">Exportar presupuesto</h3>
                  <p className="text-xs text-neutral-500 mt-1">Seleccioná el tipo de PDF a generar</p>
                </div>
                <div className="p-6 space-y-3">
                  <button
                    type="button"
                    onClick={() => generarPDF("cliente")}
                    className="w-full py-3 px-4 bg-neutral-900 hover:bg-neutral-800 text-white font-medium rounded-xl transition-colors text-sm text-left flex items-center gap-3"
                  >
                    <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-base">
                      C
                    </span>
                    <span>
                      <span className="block font-semibold">PDF Cliente</span>
                      <span className="block text-xs text-neutral-300 font-normal">Solo precios al cliente, para enviar</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => generarPDF("interno")}
                    className="w-full py-3 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 font-medium rounded-xl transition-colors text-sm text-left flex items-center gap-3 border border-neutral-200"
                  >
                    <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-neutral-900/10 flex items-center justify-center text-base">
                      I
                    </span>
                    <span>
                      <span className="block font-semibold">PDF Interno</span>
                      <span className="block text-xs text-neutral-500 font-normal">Costos, márgenes y análisis completo</span>
                    </span>
                  </button>
                </div>
                <div className="px-6 py-3 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setShowPdfModal(false)}
                    className="w-full py-2 text-sm text-neutral-500 hover:text-neutral-700 transition-colors font-medium"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
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
  );
}
