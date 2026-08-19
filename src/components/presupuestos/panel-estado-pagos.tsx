"use client";

import { useMemo, useState } from "react";
import {
  agruparPagosPorProveedor,
  totalesPagos,
  ESTADO_PAGO_LABEL,
  type LineaParaPago,
  type PagoRegistrado,
} from "@/lib/presupuestos/estado-pagos";
import { CANAL_PAGO_LABEL_CORTO, CANALES_PAGO } from "@/lib/presupuestos/canal-pago";

const money = (v: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(v);

const TONO_ESTADO = {
  PENDIENTE: "bg-rose-100 text-rose-700",
  PARCIAL: "bg-amber-100 text-amber-800",
  PAGADO: "bg-emerald-100 text-emerald-800",
} as const;

function Barra({ avance }: { avance: number | null }) {
  if (avance === null) {
    return <div className="h-1.5 w-full rounded-full border border-dashed border-neutral-300" />;
  }
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
      <div
        className={`h-full rounded-full transition-[width] duration-500 ${
          avance >= 99.5 ? "bg-emerald-500" : avance > 0 ? "bg-neutral-800" : "bg-neutral-300"
        }`}
        style={{ width: `${Math.max(avance > 0 ? 3 : 0, avance)}%` }}
      />
    </div>
  );
}

/**
 * Estado de pagos del presupuesto, agrupado por proveedor.
 * Contesta "cuánto falta girarle a cada uno" sin tener que sumar a mano.
 */
export function PanelEstadoPagos({
  lineas,
  pagos,
}: {
  lineas: LineaParaPago[];
  pagos: PagoRegistrado[];
}) {
  const [soloPendientes, setSoloPendientes] = useState(false);
  const [abierto, setAbierto] = useState<string | null>(null);

  const grupos = useMemo(() => agruparPagosPorProveedor(lineas, pagos), [lineas, pagos]);
  const visibles = useMemo(
    () => (soloPendientes ? grupos.filter((g) => g.estado !== "PAGADO") : grupos),
    [grupos, soloPendientes]
  );
  const totales = useMemo(() => totalesPagos(grupos), [grupos]);

  return (
    <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-neutral-100 px-5 py-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-500">
            Pagos
          </p>
          <h3 className="mt-1 text-base font-semibold text-neutral-950">Estado por proveedor</h3>
          <p className="mt-0.5 text-xs text-neutral-500">
            Comprometido por el presupuesto contra lo efectivamente pagado.
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-neutral-600">
          <input
            type="checkbox"
            checked={soloPendientes}
            onChange={(e) => setSoloPendientes(e.target.checked)}
            className="h-4 w-4 rounded border-neutral-300"
          />
          Solo con saldo
        </label>
      </div>

      <dl className="grid grid-cols-2 gap-px bg-neutral-200 lg:grid-cols-4">
        {[
          { label: "Comprometido", valor: money(totales.comprometido), tono: "text-neutral-900" },
          { label: "Pagado", valor: money(totales.pagado), tono: "text-emerald-700" },
          {
            label: "Falta pagar",
            valor: money(totales.pendiente),
            tono: totales.pendiente > 0 ? "text-amber-700" : "text-neutral-900",
          },
          {
            label: "Proveedores",
            valor: `${totales.pendientes} / ${totales.proveedores}`,
            tono: "text-neutral-900",
          },
        ].map((k) => (
          <div key={k.label} className="bg-white px-4 py-3">
            <dt className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              {k.label}
            </dt>
            <dd className={`mt-1 text-lg font-semibold tabular-nums ${k.tono}`}>{k.valor}</dd>
          </div>
        ))}
      </dl>

      <div>
        {visibles.map((grupo) => {
          const clave = grupo.proveedorId ?? "__sin__";
          const estaAbierto = abierto === clave;
          return (
            <div key={clave} className="border-b border-neutral-100 last:border-0">
              <button
                type="button"
                onClick={() => setAbierto(estaAbierto ? null : clave)}
                aria-expanded={estaAbierto}
                className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition hover:bg-neutral-50"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-neutral-950">
                    {grupo.proveedorNombre}
                  </span>
                  <span className="mt-0.5 block text-xs text-neutral-500">
                    {grupo.lineas.length} {grupo.lineas.length === 1 ? "ítem" : "ítems"}
                    {grupo.canales.A_DEFINIR > 0 && " · reparto a definir"}
                  </span>
                </span>

                <span className="hidden w-40 shrink-0 md:block">
                  <span className="mb-1.5 block text-right text-[11px] tabular-nums text-neutral-400">
                    {grupo.avance === null ? "—" : `${grupo.avance.toFixed(0)}%`}
                  </span>
                  <Barra avance={grupo.avance} />
                </span>

                <span className="shrink-0 text-right">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    Falta
                  </span>
                  <span
                    className={`block text-sm font-semibold tabular-nums ${
                      grupo.pendiente.ARS > 0 ? "text-amber-700" : "text-neutral-400"
                    }`}
                  >
                    {money(grupo.pendiente.ARS)}
                  </span>
                </span>

                <span
                  className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold ${
                    TONO_ESTADO[grupo.estado]
                  }`}
                >
                  {ESTADO_PAGO_LABEL[grupo.estado]}
                </span>
              </button>

              {estaAbierto && (
                <div className="px-5 pb-5">
                  <div className="mb-3 flex flex-wrap gap-2">
                    {CANALES_PAGO.map((canal) =>
                      grupo.canales[canal] > 0 ? (
                        <span
                          key={canal}
                          className={`rounded-lg px-2.5 py-1 text-xs ${
                            canal === "A_DEFINIR"
                              ? "bg-amber-50 text-amber-900"
                              : "bg-neutral-100 text-neutral-700"
                          }`}
                        >
                          {CANAL_PAGO_LABEL_CORTO[canal]}{" "}
                          <strong className="tabular-nums">{money(grupo.canales[canal])}</strong>
                        </span>
                      ) : null
                    )}
                  </div>
                  <dl className="divide-y divide-neutral-100 border-y border-neutral-100">
                    {grupo.lineas.map((l) => (
                      <div key={l.id} className="flex items-center justify-between gap-4 py-2">
                        <dt className="min-w-0 text-sm text-neutral-700">
                          <span className="truncate">{l.item}</span>
                          <span className="ml-2 text-xs text-neutral-400">{l.sectorNombre}</span>
                        </dt>
                        <dd className="shrink-0 text-sm font-medium tabular-nums text-neutral-900">
                          {money(l.cantidad * l.costoUnitario)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>
          );
        })}

        {visibles.length === 0 && (
          <p className="px-5 py-12 text-center text-sm text-neutral-500">
            {grupos.length === 0
              ? "Cargá ítems con proveedor para ver el estado de pagos."
              : "No hay proveedores con saldo pendiente."}
          </p>
        )}
      </div>
    </section>
  );
}
