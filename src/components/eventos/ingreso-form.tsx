"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Select } from "@/components/ui/select";

export function IngresoForm({ eventoId }: { eventoId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    monto: "",
    metodoPago: "TRANSF_ARS",
    concepto: "",
    fecha: new Date().toISOString().slice(0, 10),
    tipo: "FACTURACION",
    numeroFactura: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.monto) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ingresos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventoId,
          monto: parseFloat(form.monto),
          metodoPago: form.metodoPago,
          concepto: form.concepto || null,
          fecha: form.fecha,
          tipo: form.tipo,
          numeroFactura: form.numeroFactura || null,
        }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      setForm({ ...form, monto: "", concepto: "", numeroFactura: "" });
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "px-3 py-2.5 rounded-lg bg-white border border-neutral-200 text-neutral-900 text-sm focus:ring-2 focus:ring-neutral-200 focus:border-neutral-300 transition-colors placeholder:text-neutral-400";
  const labelClass = "block text-xs font-medium text-neutral-600 mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-x-5 gap-y-4 items-end p-6 bg-white rounded-xl border border-neutral-200 shadow-sm mb-6">
      <div>
        <label className={labelClass}>Monto</label>
        <input
          type="number"
          step="0.01"
          value={form.monto}
          onChange={(e) => setForm({ ...form, monto: e.target.value })}
          required
          placeholder="0"
          className={`w-28 ${inputClass}`}
        />
      </div>
      <div className="min-w-[140px]">
        <label className={labelClass}>Método</label>
        <Select
          value={form.metodoPago}
          onChange={(v) => setForm({ ...form, metodoPago: v })}
          options={[
            { value: "EFECTIVO_USD", label: "Efectivo USD" },
            { value: "EFECTIVO_ARS", label: "Efectivo ARS" },
            { value: "TRANSF_ARS", label: "Transf. ARS" },
            { value: "TRANSF_USD", label: "Transf. USD" },
          ]}
        />
      </div>
      <div className="min-w-[130px]">
        <label className={labelClass}>Tipo</label>
        <Select
          value={form.tipo}
          onChange={(v) => setForm({ ...form, tipo: v })}
          options={[
            { value: "FACTURACION", label: "Facturación" },
            { value: "ANTICIPO", label: "Anticipo" },
            { value: "PAGO_PARCIAL", label: "Pago parcial" },
          ]}
        />
      </div>
      <div>
        <label className={labelClass}>Fecha</label>
        <input
          type="date"
          value={form.fecha}
          onChange={(e) => setForm({ ...form, fecha: e.target.value })}
          className={`w-full ${inputClass}`}
        />
      </div>
      <div className="min-w-[120px]">
        <label className={labelClass}>Nº Factura</label>
        <input
          type="text"
          value={form.numeroFactura}
          onChange={(e) => setForm({ ...form, numeroFactura: e.target.value })}
          placeholder="Opcional"
          className={`w-full ${inputClass}`}
        />
      </div>
      <div className="min-w-[150px]">
        <label className={labelClass}>Concepto</label>
        <input
          type="text"
          value={form.concepto}
          onChange={(e) => setForm({ ...form, concepto: e.target.value })}
          placeholder="Opcional"
          className={`w-full ${inputClass}`}
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2.5 bg-white hover:bg-neutral-50 text-neutral-700 rounded-lg border border-neutral-200 font-medium text-sm shadow-sm hover:shadow transition-all disabled:opacity-50 flex items-center gap-2 min-w-[100px] justify-center"
      >
        {loading ? <LoadingSpinner className="h-4 w-4" /> : null}
        {loading ? "Guardando..." : "Agregar"}
      </button>
    </form>
  );
}
