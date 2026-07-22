"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Select } from "@/components/ui/select";
import { ROL_COMPROMISO, ROL_MOVIMIENTO, esMovimientoPago } from "@/lib/pagos-proveedor-utils";

type Pago = {
  id: string;
  monto: number;
  fecha: Date;
  concepto: string | null;
  metodoPago: string;
  rol?: string;
  compromisoId?: string | null;
  proveedor: { nombre: string };
  rubro: { nombre: string };
};

type Props = {
  eventoId: string;
  pagos: Pago[];
  puedeRegistrarMovimiento: boolean;
  puedeEliminar: boolean;
  puedeCargarCompromiso: boolean;
};

const METODOS: Record<string, string> = {
  EFECTIVO_USD: "Efectivo USD",
  EFECTIVO_ARS: "Efectivo ARS",
  TRANSF_ARS: "Transf. ARS",
  TRANSF_USD: "Transf. USD",
  EFECTIVO: "Efectivo ARS",
  TRANSFERENCIA: "Transf. ARS",
};

export function PagosProveedores({
  eventoId,
  pagos,
  puedeRegistrarMovimiento,
  puedeEliminar,
  puedeCargarCompromiso,
}: Props) {
  const router = useRouter();
  const [modoAlta, setModoAlta] = useState<"MOVIMIENTO" | "COMPROMISO">("MOVIMIENTO");
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
    metodoPago: "TRANSF_ARS",
    compromisoId: "",
  });

  useEffect(() => {
    fetch("/api/proveedores")
      .then((r) => r.json())
      .then(setProveedores)
      .catch(console.error);
  }, []);

  const compromisosOpts = pagos
    .filter((p) => (p.rol ?? ROL_MOVIMIENTO) === ROL_COMPROMISO)
    .map((c) => ({
      value: c.id,
      label: `${c.proveedor.nombre} — $${c.monto.toLocaleString("es-AR")}${c.concepto ? ` (${c.concepto})` : ""}`,
    }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const esCompromiso = modoAlta === "COMPROMISO";
    if (esCompromiso && !puedeCargarCompromiso) return;
    if (!esCompromiso && !puedeRegistrarMovimiento) return;
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
          metodoPago: form.metodoPago,
          rol: esCompromiso ? ROL_COMPROMISO : ROL_MOVIMIENTO,
          compromisoId: esCompromiso ? null : form.compromisoId || null,
        }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      setForm({ ...form, monto: "", concepto: "", compromisoId: "" });
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!puedeEliminar) return;
    if (!confirm("¿Eliminar este registro?")) return;
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

  const pagosOrdenados = [...pagos].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  );
  const soloMovimientos = pagos.filter(esMovimientoPago);
  const soloCompromisos = pagos.filter((p) => (p.rol ?? ROL_MOVIMIENTO) === ROL_COMPROMISO);

  const totalMov = soloMovimientos.reduce((s, p) => s + p.monto, 0);
  const totalComp = soloCompromisos.reduce((s, p) => s + p.monto, 0);
  const totalARS = soloMovimientos
    .filter((p) => {
      const m = p.metodoPago || "";
      return m.endsWith("_ARS") || m === "TRANSFERENCIA" || m === "EFECTIVO" || m === "CHEQUE" || m === "OTRO";
    })
    .reduce((s, p) => s + p.monto, 0);
  const totalUSD = soloMovimientos
    .filter((p) => (p.metodoPago || "").endsWith("_USD"))
    .reduce((s, p) => s + p.monto, 0);
  const porMetodo = soloMovimientos.reduce(
    (acc, p) => {
      const m = p.metodoPago || "TRANSF_ARS";
      acc[m] = (acc[m] ?? 0) + p.monto;
      return acc;
    },
    {} as Record<string, number>
  );

  const inputClass =
    "px-3.5 py-2.5 rounded-lg bg-white border border-neutral-200 text-neutral-900 text-sm transition-colors hover:border-neutral-300 focus:ring-2 focus:ring-neutral-200 focus:border-neutral-300 placeholder:text-neutral-400";
  const labelClass = "block text-xs font-medium text-neutral-600 mb-1.5";

  const proveedorOptions = proveedores.map((p) => ({
    value: p.id,
    label: `${p.nombre} (${p.rubro.nombre})`,
  }));

  const metodoOptions = [
    { value: "EFECTIVO_USD", label: "Efectivo USD" },
    { value: "EFECTIVO_ARS", label: "Efectivo ARS" },
    { value: "TRANSF_ARS", label: "Transf. ARS" },
    { value: "TRANSF_USD", label: "Transf. USD" },
  ];

  const mostrarFormulario = puedeRegistrarMovimiento || puedeCargarCompromiso;
  const mostrarSelectorModo = puedeRegistrarMovimiento && puedeCargarCompromiso;

  return (
    <div className="space-y-6">
      {mostrarFormulario && (
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-2 gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:grid-cols-3 lg:grid-cols-6"
        >
          {mostrarSelectorModo && (
            <div className="col-span-2 flex flex-wrap items-center gap-3 sm:col-span-6">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Alta</span>
              <div className="inline-flex gap-1 rounded-xl bg-neutral-100 p-1">
                <button
                  type="button"
                  onClick={() => setModoAlta("MOVIMIENTO")}
                  className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all ${
                    modoAlta === "MOVIMIENTO" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-800"
                  }`}
                >
                  Pago realizado
                </button>
                <button
                  type="button"
                  onClick={() => setModoAlta("COMPROMISO")}
                  className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all ${
                    modoAlta === "COMPROMISO" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-800"
                  }`}
                >
                  Cotización / compromiso
                </button>
              </div>
            </div>
          )}
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
            <label className={labelClass}>{modoAlta === "COMPROMISO" ? "Monto total ($)" : "Monto ($)"}</label>
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
          {modoAlta === "MOVIMIENTO" && puedeRegistrarMovimiento && (
            <div>
              <label className={labelClass}>Método</label>
              <Select value={form.metodoPago} onChange={(v) => setForm({ ...form, metodoPago: v })} options={metodoOptions} />
            </div>
          )}
          {modoAlta === "MOVIMIENTO" && puedeRegistrarMovimiento && (
            <div className="sm:col-span-2 lg:col-span-3">
              <label className={labelClass}>Imputar a cotización (opcional)</label>
              <Select
                value={form.compromisoId}
                onChange={(v) => setForm({ ...form, compromisoId: v })}
                options={compromisosOpts}
                placeholder="Sin vincular — pago suelto"
              />
            </div>
          )}
          <div className="sm:col-span-2 lg:col-span-1 flex flex-col justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2.5 rounded-lg font-medium text-sm shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-white bg-neutral-900 hover:bg-neutral-800"
            >
              {loading ? <LoadingSpinner className="h-4 w-4" /> : null}
              {modoAlta === "COMPROMISO" ? "Guardar cotización" : "Registrar pago"}
            </button>
          </div>
          <div className="col-span-2 sm:col-span-3 lg:col-span-6">
            <label className={labelClass}>Concepto (opcional)</label>
            <input
              type="text"
              value={form.concepto}
              onChange={(e) => setForm({ ...form, concepto: e.target.value })}
              placeholder={modoAlta === "COMPROMISO" ? "Ej. Catering confirmado" : "Ej: transferencia parcial..."}
              className={`w-full ${inputClass}`}
            />
          </div>
        </form>
      )}

      {pagos.length > 0 ? (
        <>
          <div className="overflow-x-auto rounded-xl border border-neutral-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50 text-left">
                  <th className="py-2.5 px-3 text-xs font-semibold text-neutral-600 uppercase">Tipo</th>
                  <th className="py-2.5 px-3 text-xs font-semibold text-neutral-600 uppercase">Fecha</th>
                  <th className="py-2.5 px-3 text-xs font-semibold text-neutral-600 uppercase">Proveedor</th>
                  <th className="py-2.5 px-3 text-xs font-semibold text-neutral-600 uppercase">Rubro</th>
                  <th className="py-2.5 px-3 text-xs font-semibold text-neutral-600 uppercase">Concepto</th>
                  <th className="py-2.5 px-3 text-xs font-semibold text-neutral-600 uppercase">Método</th>
                  <th className="py-2.5 px-3 text-xs font-semibold text-neutral-600 uppercase text-right">Monto</th>
                  <th className="py-2.5 px-3 w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {pagosOrdenados.map((p) => {
                  const esComp = (p.rol ?? ROL_MOVIMIENTO) === ROL_COMPROMISO;
                  return (
                    <tr key={p.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                            esComp ? "bg-neutral-200 text-neutral-800" : "bg-neutral-100 text-neutral-700"
                          }`}
                        >
                          {esComp ? "Cotización" : "Pago"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-neutral-600">
                        {new Date(p.fecha).toLocaleDateString("es-AR")}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-neutral-900">{p.proveedor.nombre}</td>
                      <td className="py-2.5 px-3 text-neutral-600">{p.rubro.nombre}</td>
                      <td className="py-2.5 px-3 text-neutral-500 max-w-[180px] truncate" title={p.concepto ?? undefined}>
                        {p.concepto || "—"}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-700">
                          {METODOS[p.metodoPago] ?? p.metodoPago}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-neutral-900 tabular-nums">
                        ${p.monto.toLocaleString("es-AR")}
                      </td>
                      <td className="py-2.5 px-3">
                        {puedeEliminar && (
                          <button
                            type="button"
                            onClick={() => handleDelete(p.id)}
                            disabled={deletingId === p.id}
                            className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors disabled:opacity-50"
                            title="Eliminar"
                          >
                            {deletingId === p.id ? (
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
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-4">
            <span className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-600">
              Pagos (mov.): <strong className="tabular-nums text-neutral-900">${totalMov.toLocaleString("es-AR")}</strong>
            </span>
            {totalComp > 0 && (
              <span className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-600">
                Cotizaciones: <strong className="tabular-nums text-neutral-900">${totalComp.toLocaleString("es-AR")}</strong>
              </span>
            )}
            <span className="rounded-lg bg-neutral-100 px-3 py-1.5 text-xs text-neutral-600">
              ARS (mov.): <strong className="tabular-nums text-neutral-900">${totalARS.toLocaleString("es-AR")}</strong>
            </span>
            <span className="rounded-lg bg-neutral-100 px-3 py-1.5 text-xs text-neutral-600">
              USD (mov.): <strong className="tabular-nums text-neutral-900">${totalUSD.toLocaleString("es-AR")}</strong>
            </span>
            {Object.entries(porMetodo).map(([metodo, monto]) => (
              <span key={metodo} className="rounded-lg bg-neutral-50 px-3 py-1.5 text-xs text-neutral-500">
                {METODOS[metodo] ?? metodo}: <span className="tabular-nums">${monto.toLocaleString("es-AR")}</span>
              </span>
            ))}
          </div>
        </>
      ) : (
        <div className="py-12 text-center rounded-xl border border-dashed border-neutral-200 bg-neutral-50/50">
          <p className="text-neutral-500">No hay pagos ni cotizaciones registrados</p>
        </div>
      )}
    </div>
  );
}
