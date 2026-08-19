"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
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
  pagos,
  puedeRegistrarMovimiento,
  puedeEliminar,
  puedeCargarCompromiso,
}: Props) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const mostrarFormulario = puedeRegistrarMovimiento || puedeCargarCompromiso;

  return (
    <div className="space-y-6">
      {mostrarFormulario && (
        <p className="rounded-lg border border-neutral-200 bg-neutral-50/70 px-4 py-2.5 text-[13px] text-neutral-600">
          Las altas se cargan desde <strong className="font-semibold text-neutral-900">Registrar
          movimiento</strong>, arriba. Acá se consulta y se da de baja.
        </p>
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
