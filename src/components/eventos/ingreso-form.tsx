"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Select } from "@/components/ui/select";
import { TIPO_INGRESO, type TipoIngreso } from "@/lib/ingresos";

const inputClass =
  "h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900 transition-colors placeholder:text-neutral-400 focus:border-neutral-300 focus:ring-2 focus:ring-neutral-200";
const labelClass = "mb-1.5 block text-xs font-medium text-neutral-600";

export function IngresoForm({
  eventoId,
  proximoPago,
}: {
  eventoId: string;
  /** Número que le tocaría al próximo ingreso de tipo PAGO. */
  proximoPago: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    monto: "",
    metodoPago: "TRANSF_ARS",
    concepto: "",
    fecha: new Date().toISOString().slice(0, 10),
    tipo: "PAGO" as TipoIngreso,
    numeroFactura: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.monto) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ingresos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventoId,
          monto: form.monto,
          metodoPago: form.metodoPago,
          concepto: form.concepto || null,
          fecha: form.fecha,
          tipo: form.tipo,
          numeroFactura: form.numeroFactura || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "No se pudo registrar el ingreso");
      }
      setForm({ ...form, monto: "", concepto: "", numeroFactura: "" });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar el ingreso");
    } finally {
      setLoading(false);
    }
  }

  const etiquetaDestino =
    form.tipo === "PAGO" ? `Se registra como Pago ${proximoPago}` : TIPO_INGRESO[form.tipo];

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">Registrar cobro</h3>
          <p className="mt-0.5 text-xs text-neutral-500">
            Los pagos se numeran solos según su fecha.
          </p>
        </div>
        <span className="rounded-lg bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-neutral-700">
          {etiquetaDestino}
        </span>
      </div>

      <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className={labelClass} htmlFor="ingreso-tipo">
            Tipo de cobro
          </label>
          <Select
            value={form.tipo}
            onChange={(v) => setForm({ ...form, tipo: v as TipoIngreso })}
            options={[
              { value: "SENA", label: "Seña" },
              { value: "ANTICIPO", label: "Anticipo" },
              { value: "PAGO", label: `Pago ${proximoPago}` },
            ]}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="ingreso-monto">
            Monto
          </label>
          <input
            id="ingreso-monto"
            type="number"
            step="0.01"
            min="0"
            value={form.monto}
            onChange={(e) => setForm({ ...form, monto: e.target.value })}
            required
            placeholder="0"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Método</label>
          <Select
            value={form.metodoPago}
            onChange={(v) => setForm({ ...form, metodoPago: v })}
            options={[
              { value: "TRANSF_ARS", label: "Transferencia ARS" },
              { value: "EFECTIVO_ARS", label: "Efectivo ARS" },
              { value: "TRANSF_USD", label: "Transferencia USD" },
              { value: "EFECTIVO_USD", label: "Efectivo USD" },
            ]}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="ingreso-fecha">
            Fecha
          </label>
          <input
            id="ingreso-fecha"
            type="date"
            value={form.fecha}
            onChange={(e) => setForm({ ...form, fecha: e.target.value })}
            className={inputClass}
          />
        </div>

        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="ingreso-concepto">
            Concepto <span className="font-normal text-neutral-400">(opcional)</span>
          </label>
          <input
            id="ingreso-concepto"
            type="text"
            value={form.concepto}
            onChange={(e) => setForm({ ...form, concepto: e.target.value })}
            placeholder="Detalle del cobro"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="ingreso-factura">
            Nº Factura <span className="font-normal text-neutral-400">(opcional)</span>
          </label>
          <input
            id="ingreso-factura"
            type="text"
            value={form.numeroFactura}
            onChange={(e) => setForm({ ...form, numeroFactura: e.target.value })}
            placeholder="A-0001-..."
            className={inputClass}
          />
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={loading}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading && <LoadingSpinner className="h-4 w-4 text-white" />}
            {loading ? "Guardando..." : "Registrar cobro"}
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}
    </form>
  );
}
