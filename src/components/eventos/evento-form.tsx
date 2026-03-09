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
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
      <div>
        <label className="block text-sm text-gray-700 mb-1">Nombre</label>
        <input
          type="text"
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          required
          className="w-full px-4 py-2 rounded bg-white border border-gray-300 text-gray-900"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-700 mb-1">Fecha</label>
          <input
            type="date"
            value={form.fecha}
            onChange={(e) => setForm({ ...form, fecha: e.target.value })}
            required
            className="w-full px-4 py-2 rounded bg-white border border-gray-300 text-gray-900"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Fecha fin (opcional)</label>
          <input
            type="date"
            value={form.fechaFin}
            onChange={(e) => setForm({ ...form, fechaFin: e.target.value })}
            className="w-full px-4 py-2 rounded bg-white border border-gray-300 text-gray-900"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-700 mb-1">Tipo</label>
          <select
            value={form.tipo}
            onChange={(e) => setForm({ ...form, tipo: e.target.value })}
            className="w-full px-4 py-2 rounded bg-white border border-gray-300 text-gray-900"
          >
            <option value="CORPORATIVO">Corporativo</option>
            <option value="PARTICULAR">Particular</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Estado</label>
          <select
            value={form.estado}
            onChange={(e) => setForm({ ...form, estado: e.target.value })}
            className="w-full px-4 py-2 rounded bg-white border border-gray-300 text-gray-900"
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
        <label className="block text-sm text-gray-700 mb-1">Cliente</label>
        <input
          type="text"
          value={form.cliente}
          onChange={(e) => setForm({ ...form, cliente: e.target.value })}
          required
          className="w-full px-4 py-2 rounded bg-white border border-gray-300 text-gray-900"
        />
      </div>
      <div>
        <label className="block text-sm text-gray-700 mb-1">Descripción</label>
        <textarea
          value={form.descripcion}
          onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
          rows={3}
          className="w-full px-4 py-2 rounded bg-white border border-gray-300 text-gray-900"
        />
      </div>
      {error && <p className="text-rose-600 text-sm">{error}</p>}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-lg"
        >
          {loading ? "Guardando..." : evento ? "Actualizar" : "Crear"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-lg border border-gray-300"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
