"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Navegación por secciones del evento.
 *
 * Antes todo vivía en una sola página larguísima. Cada sección es ahora una
 * página completa: se navega por URL (`?s=`), así que se puede compartir el
 * link, volver con el botón atrás y el servidor rinde solo lo que se mira.
 */

export type SeccionId = "resumen" | "cobros" | "pagos" | "utileros" | "caja";

export type ItemSeccion = { id: SeccionId; label: string; badge?: number };

export function SeccionesNav({
  items,
  activa,
}: {
  items: ItemSeccion[];
  activa: SeccionId;
}) {
  const pathname = usePathname();
  const params = useSearchParams();

  function href(id: SeccionId) {
    const next = new URLSearchParams(params.toString());
    if (id === "resumen") next.delete("s");
    else next.set("s", id);
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  return (
    <nav
      aria-label="Secciones del evento"
      className="sticky top-0 z-30 -mx-4 mb-6 border-b border-neutral-200 bg-surface-muted/95 px-4 backdrop-blur sm:-mx-6 sm:px-6"
    >
      <div className="flex gap-1 overflow-x-auto py-2">
        {items.map((item) => {
          const activo = item.id === activa;
          return (
            <Link
              key={item.id}
              href={href(item.id)}
              scroll={false}
              aria-current={activo ? "page" : undefined}
              className={`inline-flex shrink-0 items-center gap-2 rounded-md px-3.5 py-2 text-[13px] font-medium transition ${
                activo
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-600 hover:bg-neutral-200/60 hover:text-neutral-900"
              }`}
            >
              {item.label}
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`rounded px-1.5 text-[11px] tabular-nums ${
                    activo ? "bg-white/20 text-white" : "bg-neutral-200 text-neutral-600"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
