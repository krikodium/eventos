"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-700 bg-slate-800">
        <h2 className="font-semibold text-white text-sm uppercase tracking-wider">
          {evento ? "Editar evento" : "Nuevo evento"}
        </h2>
        <p className="text-slate-300 text-xs mt-0.5">Completa los datos del evento</p>
      </div>
      <div className="p-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
        <input
          type="text"
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          required
          className="w-full px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-900"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
          <input
            type="date"
            value={form.fecha}
            onChange={(e) => setForm({ ...form, fecha: e.target.value })}
            required
            className="w-full px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Fecha fin (opcional)</label>
          <input
            type="date"
            value={form.fechaFin}
            onChange={(e) => setForm({ ...form, fechaFin: e.target.value })}
            className="w-full px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-900"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
          <select
            value={form.tipo}
            onChange={(e) => setForm({ ...form, tipo: e.target.value })}
            className="w-full px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-900"
          >
            <option value="CORPORATIVO">Corporativo</option>
            <option value="PARTICULAR">Particular</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
          <select
            value={form.estado}
            onChange={(e) => setForm({ ...form, estado: e.target.value })}
            className="w-full px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-900"
          >
            <option value="BORRADOR">Borrador</option>
            <option value="CONFIRMADO">Confirmado</option>
            <option value="EN_CURSO">En curso</option>
            <option value="FINALIZADO">Finalizado</option>
            <option value="FACTURADO">Facturado</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
        <input
          type="text"
          value={form.cliente}
          onChange={(e) => setForm({ ...form, cliente: e.target.value })}
          required
          className="w-full px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-900"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
        <textarea
          value={form.descripcion}
          onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
          rows={2}
          className="w-full px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-900"
        />
      </div>

      <div className="border-t border-slate-200 pt-4 mt-6">
        <h4 className="text-sm font-semibold text-slate-900 mb-3">Detalles adicionales</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Organizadora</label>
            <input
              type="text"
              value={form.organizadora}
              onChange={(e) => setForm({ ...form, organizadora: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-900"
              placeholder="Ej: Azares"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Provincia</label>
            <input
              type="text"
              value={form.provincia}
              onChange={(e) => setForm({ ...form, provincia: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-900"
              placeholder="Ej: Buenos Aires"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Localidad</label>
            <input
              type="text"
              value={form.localidad}
              onChange={(e) => setForm({ ...form, localidad: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-900"
              placeholder="Ej: Baradero"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Presupuesto total</label>
            <input
              type="number"
              step="0.01"
              value={form.presupuestoTotal}
              onChange={(e) => setForm({ ...form, presupuestoTotal: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-900"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Presupuesto Nº</label>
            <input
              type="text"
              value={form.presupuestoNro}
              onChange={(e) => setForm({ ...form, presupuestoNro: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-900"
              placeholder="Ej: 06"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Forma de pago acordada</label>
            <input
              type="text"
              value={form.formaPagoAcordada}
              onChange={(e) => setForm({ ...form, formaPagoAcordada: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-900"
              placeholder="Ej: 30% fact / saldo eft"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Honorarios HC</label>
            <input
              type="number"
              step="0.01"
              value={form.honorariosHC}
              onChange={(e) => setForm({ ...form, honorariosHC: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-900"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Viáticos armado</label>
            <input
              type="number"
              step="0.01"
              value={form.viaticosArmado}
              onChange={(e) => setForm({ ...form, viaticosArmado: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-900"
              placeholder="0"
            />
          </div>
        </div>
      </div>

      {error && <p className="text-rose-600 text-sm">{error}</p>}
      <div className="flex gap-4 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-200 font-medium text-sm shadow-sm hover:shadow transition-all disabled:opacity-50"
        >
          {loading ? "Guardando..." : evento ? "Actualizar" : "Crear"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 font-medium text-sm transition-colors"
        >
          Cancelar
        </button>
      </div>
      </div>
    </form>
  );
}
