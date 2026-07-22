"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Select } from "@/components/ui/select";

type EventoFormProps = {
  evento?: {
    id: string;
    nombre: string;
    fecha: string;
    fechaFin?: string | null;
    tipo: string;
    cliente: string;
    estado: string;
    descripcion?: string | null;
    organizadora?: string | null;
    provincia?: string | null;
    localidad?: string | null;
    presupuestoTotal?: number | null;
    presupuestoNro?: string | null;
    formaPagoAcordada?: string | null;
    honorariosHC?: number | null;
    viaticosArmado?: number | null;
  };
};

export function EventoForm({ evento }: EventoFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detallesAbierto, setDetallesAbierto] = useState(!!evento);
  const [form, setForm] = useState({
    nombre: evento?.nombre ?? "",
    fecha: evento?.fecha?.slice(0, 10) ?? "",
    fechaFin: evento?.fechaFin?.slice(0, 10) ?? "",
    tipo: evento?.tipo ?? "CORPORATIVO",
    cliente: evento?.cliente ?? "",
    estado: evento?.estado ?? "BORRADOR",
    descripcion: evento?.descripcion ?? "",
    organizadora: evento?.organizadora ?? "",
    provincia: evento?.provincia ?? "",
    localidad: evento?.localidad ?? "",
    presupuestoTotal: evento?.presupuestoTotal?.toString() ?? "",
    presupuestoNro: evento?.presupuestoNro ?? "",
    formaPagoAcordada: evento?.formaPagoAcordada ?? "",
    honorariosHC: evento?.honorariosHC?.toString() ?? "",
    viaticosArmado: evento?.viaticosArmado?.toString() ?? "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const url = evento ? `/api/eventos/${evento.id}` : "/api/eventos";
      const method = evento ? "PUT" : "POST";
      const body = {
        nombre: form.nombre,
        fecha: form.fecha,
        fechaFin: form.fechaFin || null,
        tipo: form.tipo,
        cliente: form.cliente,
        estado: form.estado,
        descripcion: form.descripcion || null,
        organizadora: form.organizadora || null,
        provincia: form.provincia || null,
        localidad: form.localidad || null,
        presupuestoTotal: form.presupuestoTotal ? Number(form.presupuestoTotal) : null,
        presupuestoNro: form.presupuestoNro || null,
        formaPagoAcordada: form.formaPagoAcordada || null,
        honorariosHC: form.honorariosHC ? Number(form.honorariosHC) : null,
        viaticosArmado: form.viaticosArmado ? Number(form.viaticosArmado) : null,
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Error al guardar");
      }
      router.push("/eventos");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 hover:border-neutral-300 focus:border-sky-500 focus:ring-4 focus:ring-sky-100";
  const labelClass = "mb-1.5 block text-xs font-semibold text-neutral-600";

  return (
    <form onSubmit={handleSubmit} className="w-full overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="border-b border-neutral-100 px-5 py-5 sm:px-6">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-600">Información principal</p>
        <h2 className="text-lg font-semibold tracking-tight text-neutral-900">
          {evento ? "Editar evento" : "Nuevo evento"}
        </h2>
        <p className="mt-1 text-sm text-neutral-500">Datos comerciales, fechas y estado operativo.</p>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelClass}>Nombre del evento</label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              required
              placeholder="Ej: Boda Juan y María"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Cliente</label>
            <input
              type="text"
              value={form.cliente}
              onChange={(e) => setForm({ ...form, cliente: e.target.value })}
              required
              placeholder="Nombre del cliente"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Organizadora</label>
            <input
              type="text"
              value={form.organizadora}
              onChange={(e) => setForm({ ...form, organizadora: e.target.value })}
              placeholder="Ej: Azares"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Fecha</label>
            <input
              type="date"
              value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Fecha fin</label>
            <input
              type="date"
              value={form.fechaFin}
              onChange={(e) => setForm({ ...form, fechaFin: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Tipo</label>
            <Select
              value={form.tipo}
              onChange={(v) => setForm({ ...form, tipo: v })}
              options={[
                { value: "CORPORATIVO", label: "Corporativo" },
                { value: "PARTICULAR", label: "Particular" },
              ]}
            />
          </div>
          <div>
            <label className={labelClass}>Estado</label>
            <Select
              value={form.estado}
              onChange={(v) => setForm({ ...form, estado: v })}
              options={[
                { value: "BORRADOR", label: "Borrador" },
                { value: "CONFIRMADO", label: "Confirmado" },
                { value: "EN_CURSO", label: "En curso" },
                { value: "FINALIZADO", label: "Finalizado" },
                { value: "FACTURADO", label: "Facturado" },
              ]}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Descripción</label>
          <textarea
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            rows={2}
            placeholder="Detalles del evento (opcional)"
            className={`${inputClass} resize-none`}
          />
        </div>

        {/* Detalles adicionales - acordeón */}
        <div className="border-t border-neutral-200 pt-4">
          <button
            type="button"
            onClick={() => setDetallesAbierto(!detallesAbierto)}
            className="flex items-center gap-2 text-sm font-medium text-neutral-700 hover:text-neutral-900 transition-colors w-full"
          >
            <svg
              className={`w-4 h-4 text-neutral-500 transition-transform ${detallesAbierto ? "rotate-90" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Ubicación, presupuesto y pagos
          </button>
          {detallesAbierto && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Provincia</label>
                <input
                  type="text"
                  value={form.provincia}
                  onChange={(e) => setForm({ ...form, provincia: e.target.value })}
                  placeholder="Ej: Buenos Aires"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Localidad</label>
                <input
                  type="text"
                  value={form.localidad}
                  onChange={(e) => setForm({ ...form, localidad: e.target.value })}
                  placeholder="Ej: Baradero"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Presupuesto total</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.presupuestoTotal}
                  onChange={(e) => setForm({ ...form, presupuestoTotal: e.target.value })}
                  placeholder="0"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Presupuesto Nº</label>
                <input
                  type="text"
                  value={form.presupuestoNro}
                  onChange={(e) => setForm({ ...form, presupuestoNro: e.target.value })}
                  placeholder="Ej: 06"
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Forma de pago acordada</label>
                <input
                  type="text"
                  value={form.formaPagoAcordada}
                  onChange={(e) => setForm({ ...form, formaPagoAcordada: e.target.value })}
                  placeholder="Ej: 30% fact / saldo eft"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Honorarios HC</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.honorariosHC}
                  onChange={(e) => setForm({ ...form, honorariosHC: e.target.value })}
                  placeholder="0"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Viáticos armado</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.viaticosArmado}
                  onChange={(e) => setForm({ ...form, viaticosArmado: e.target.value })}
                  placeholder="0"
                  className={inputClass}
                />
              </div>
            </div>
          )}
        </div>

        {error && <p className="text-rose-600 text-sm">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-50"
          >
            {loading ? <LoadingSpinner className="h-4 w-4" /> : null}
            {loading ? "Guardando..." : evento ? "Actualizar" : "Crear evento"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-neutral-600 hover:text-neutral-900 text-sm font-medium"
          >
            Cancelar
          </button>
        </div>
      </div>
    </form>
  );
}
