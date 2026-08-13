"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge, EstadoEventoBadge } from "@/components/ui/estado-badge";
import { TIPO_TAREA, TAREAS_POR_DIA, estadoPago } from "@/lib/estados";

export type HistorialItem = {
  evento: {
    id: string;
    nombre: string;
    cliente: string;
    fecha: string;
    estado: string;
  };
  tareas: { id: string; tipo: string; dias: number; monto: number }[];
  anticipo: number;
  transferencia: number;
  efectivo: number;
  total: number;
  registrado: number;
};

const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const date = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function Chevron({ abierto }: { abierto: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform duration-200 ${
        abierto ? "rotate-180" : ""
      }`}
    >
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Una participación en un evento. Cerrada muestra solo lo que se necesita para
 * decidir si vale la pena abrirla; el detalle de tareas y pagos va adentro.
 */
export function HistorialEvento({
  item,
  defaultOpen = false,
}: {
  item: HistorialItem;
  defaultOpen?: boolean;
}) {
  const [abierto, setAbierto] = useState(defaultOpen);
  const pago = estadoPago(item.total, item.registrado);
  const cantidad = item.tareas.length;

  return (
    <div className="border-b border-neutral-100 last:border-0">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex w-full items-center gap-4 px-4 py-3.5 text-left transition hover:bg-neutral-50 sm:px-5"
      >
        <span className="w-[86px] shrink-0 text-xs font-medium uppercase tracking-wide text-neutral-500">
          {date.format(new Date(item.evento.fecha))}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-neutral-950">
            {item.evento.nombre}
          </span>
          <span className="mt-0.5 block truncate text-xs text-neutral-500">
            {item.evento.cliente}
            {cantidad > 0 && ` · ${cantidad} ${cantidad === 1 ? "tarea" : "tareas"}`}
          </span>
        </span>

        <span className="hidden shrink-0 sm:block">
          <EstadoEventoBadge estado={item.evento.estado} />
        </span>

        <span className="shrink-0 text-right">
          <span className="block text-sm font-semibold tabular-nums text-neutral-950">
            {money.format(item.total)}
          </span>
          {pago.pendiente > 0 && (
            <span className="mt-0.5 block text-[11px] font-medium tabular-nums text-amber-700">
              resta {money.format(pago.pendiente)}
            </span>
          )}
        </span>

        <Chevron abierto={abierto} />
      </button>

      {abierto && (
        <div className="animate-[page-enter_200ms_ease-out] px-4 pb-5 pl-4 sm:px-5 sm:pl-[106px]">
          <div className="mb-4 flex flex-wrap items-center gap-2 sm:hidden">
            <EstadoEventoBadge estado={item.evento.estado} />
          </div>

          {cantidad > 0 ? (
            <dl className="divide-y divide-neutral-100 border-y border-neutral-100">
              {item.tareas.map((tarea) => (
                <div key={tarea.id} className="flex items-center justify-between gap-4 py-2.5">
                  <dt className="text-sm text-neutral-700">
                    {TIPO_TAREA[tarea.tipo] ?? tarea.tipo}
                    {TAREAS_POR_DIA.has(tarea.tipo) && (
                      <span className="ml-2 text-xs text-neutral-400">
                        {tarea.dias} {tarea.dias === 1 ? "día" : "días"}
                      </span>
                    )}
                  </dt>
                  <dd className="text-sm font-medium tabular-nums text-neutral-900">
                    {money.format(tarea.monto)}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="border-y border-neutral-100 py-3 text-sm text-neutral-500">
              Asignado al evento, sin tareas cargadas.
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
              <span className="text-neutral-500">
                Registrado{" "}
                <strong className="font-semibold tabular-nums text-neutral-900">
                  {money.format(item.registrado)}
                </strong>
              </span>
              <Badge tono={pago.tono} dot>
                {pago.label}
              </Badge>
            </div>
            <Link
              href={`/eventos/${item.evento.id}`}
              className="text-xs font-semibold text-accent-600 transition hover:text-accent-900"
            >
              Abrir evento →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
