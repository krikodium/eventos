"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Select } from "@/components/ui/select";
import type { EstadoCompromiso } from "@/lib/pagos-proveedor-utils";

export type CompromisoResumen = {
  id: string;
  proveedorNombre: string;
  rubroNombre: string;
  montoTotal: number;
  estado: EstadoCompromiso;
  concepto: string | null;
  fecha: Date;
};

const ESTADO_LABEL: Record<EstadoCompromiso, string> = {
  PENDIENTE: "Pendiente",
  PARTE_PAGA: "Parte paga",
  PAGADO: "Pagado",
};

const ESTADO_CLASS: Record<EstadoCompromiso, string> = {
  PENDIENTE: "bg-neutral-100 text-neutral-800",
  PARTE_PAGA: "bg-neutral-200 text-neutral-800",
  PAGADO: "bg-neutral-300 text-neutral-900",
};

type Props = {
  eventoId: string;
  items: CompromisoResumen[];
  puedeCargar: boolean;
};

export function CompromisosProveedorEmpleado({ eventoId, items, puedeCargar }: Props) {
  const router = useRouter();
  const [proveedores, setProveedores] = useState<
    Array<{ id: string; nombre: string; rubroId: string; rubro: { id: string; nombre: string } }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    proveedorId: "",
    monto: "",
    fecha: new Date().toISOString().slice(0, 10),
    concepto: "",
  });

  useEffect(() => {
    fetch("/api/proveedores")
      .then((r) => r.json())
      .then(setProveedores)
      .catch(console.error);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.proveedorId || !form.monto) return;
    setLoading(true);
    try {
      const prov = proveedores.find((p) => p.id === form.proveedorId);
      const res = await fetch("/api/pagos-proveedor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventoId,
          proveedorId: form.proveedorId,
          rubroId: prov!.rubroId,
          monto: parseFloat(form.monto),
          fecha: form.fecha,
          concepto: form.concepto || null,
          rol: "COMPROMISO",
        }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      setForm({ ...form, monto: "", concepto: "" });
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string, estado: EstadoCompromiso) {
    if (estado !== "PENDIENTE") {
      alert("Solo se pueden eliminar compromisos pendientes (sin pagos registrados).");
      return;
    }
    if (!confirm("¿Eliminar esta cotización / compromiso?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/pagos-proveedor/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Error");
      }
      router.refresh();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setDeletingId(null);
    }
  }

  const inputClass =
    "px-3 py-2 rounded-lg bg-white border border-neutral-200 text-neutral-900 text-sm focus:ring-2 focus:ring-neutral-200 focus:border-neutral-300 placeholder:text-neutral-400";
  const labelClass = "block text-xs font-medium text-neutral-600 mb-1";

  const proveedorOptions = proveedores.map((p) => ({
    value: p.id,
    label: `${p.nombre} (${p.rubro.nombre})`,
  }));

  return (
    <div className="space-y-6">
      <p className="text-sm text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-3">
        Cargá las cotizaciones o montos acordados con proveedores. El estado (pendiente, parte paga o pagado) se
        actualiza cuando un administrador registra pagos en el sistema.
      </p>

      {puedeCargar && (
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 p-4 bg-neutral-50 rounded-xl border border-neutral-200"
        >
          <div className="sm:col-span-2">
            <label className={labelClass}>Proveedor</label>
            <Select
              value={form.proveedorId}
              onChange={(v) => setForm({ ...form, proveedorId: v })}
              options={proveedorOptions}
              placeholder="Seleccionar"
              required
            />
          </div>
          <div>
            <label className={labelClass}>Monto total ($)</label>
            <input
              type="number"
              step="0.01"
              value={form.monto}
              onChange={(e) => setForm({ ...form, monto: e.target.value })}
              required
              placeholder="0"
              className={`w-full ${inputClass}`}
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
          <div className="col-span-2 sm:col-span-3 lg:col-span-6">
            <label className={labelClass}>Concepto (opcional)</label>
            <input
              type="text"
              value={form.concepto}
              onChange={(e) => setForm({ ...form, concepto: e.target.value })}
              placeholder="Ej. Catering, sonido..."
              className={`w-full ${inputClass}`}
            />
          </div>
          <div className="col-span-2 sm:col-span-3 flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg font-medium text-sm shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <LoadingSpinner className="h-4 w-4" /> : null}
              Agregar cotización
            </button>
          </div>
        </form>
      )}

      {items.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-neutral-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-100 text-left">
                <th className="py-2.5 px-3 text-xs font-semibold text-neutral-600 uppercase">Fecha</th>
                <th className="py-2.5 px-3 text-xs font-semibold text-neutral-600 uppercase">Proveedor</th>
                <th className="py-2.5 px-3 text-xs font-semibold text-neutral-600 uppercase">Rubro</th>
                <th className="py-2.5 px-3 text-xs font-semibold text-neutral-600 uppercase">Concepto</th>
                <th className="py-2.5 px-3 text-xs font-semibold text-neutral-600 uppercase">Estado</th>
                <th className="py-2.5 px-3 text-xs font-semibold text-neutral-600 uppercase text-right">
                  Monto total
                </th>
                <th className="py-2.5 px-3 w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {items.map((row) => (
                <tr key={row.id} className="hover:bg-neutral-50/50 transition-colors">
                  <td className="py-2.5 px-3 text-neutral-600">
                    {new Date(row.fecha).toLocaleDateString("es-AR")}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-neutral-900">{row.proveedorNombre}</td>
                  <td className="py-2.5 px-3 text-neutral-600">{row.rubroNombre}</td>
                  <td className="py-2.5 px-3 text-neutral-500 max-w-[180px] truncate" title={row.concepto ?? undefined}>
                    {row.concepto || "—"}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${ESTADO_CLASS[row.estado]}`}
                    >
                      {ESTADO_LABEL[row.estado]}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold text-neutral-900 tabular-nums">
                    ${row.montoTotal.toLocaleString("es-AR")}
                  </td>
                  <td className="py-2.5 px-3">
                    {puedeCargar && row.estado === "PENDIENTE" && (
                      <button
                        type="button"
                        onClick={() => handleDelete(row.id, row.estado)}
                        disabled={deletingId === row.id}
                        className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors disabled:opacity-50"
                        title="Eliminar compromiso pendiente"
                      >
                        {deletingId === row.id ? (
                          <LoadingSpinner className="h-4 w-4" />
                        ) : (
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-12 text-center rounded-xl border border-dashed border-neutral-200 bg-neutral-50/50">
          <p className="text-neutral-500">No hay cotizaciones cargadas para este evento.</p>
        </div>
      )}
    </div>
  );
}
