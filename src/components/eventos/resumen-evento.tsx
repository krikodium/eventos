import Link from "next/link";

/**
 * Cabecera financiera del evento: las tres cifras que importan y una barra de
 * avance de cobro. Reemplaza a la fila de 5 tarjetas iguales, donde todas
 * pesaban lo mismo y no se leía cuál era la importante.
 */

const money = (v: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(v);

export function CabeceraFinanciera({
  presupuesto,
  cobrado,
  egresos,
  balance,
}: {
  presupuesto: number;
  cobrado: number;
  egresos: number;
  balance: number;
}) {
  const porCobrar = Math.max(0, presupuesto - cobrado);
  const avance = presupuesto > 0 ? Math.min(100, (cobrado / presupuesto) * 100) : null;

  return (
    <section className="mb-6 overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <div className="grid divide-y divide-neutral-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="p-5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
            Cobrado
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-700">
            {money(cobrado)}
          </p>
          {presupuesto > 0 && (
            <>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ${
                    (avance ?? 0) >= 99.5 ? "bg-emerald-500" : "bg-neutral-800"
                  }`}
                  style={{ width: `${Math.max(avance && avance > 0 ? 3 : 0, avance ?? 0)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-neutral-500">
                {avance?.toFixed(0)}% de {money(presupuesto)}
                {porCobrar > 0 && (
                  <>
                    {" · resta "}
                    <strong className="font-semibold text-amber-700">{money(porCobrar)}</strong>
                  </>
                )}
              </p>
            </>
          )}
        </div>

        <div className="p-5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
            Egresos
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900">
            {money(egresos)}
          </p>
          <p className="mt-2 text-xs text-neutral-500">Proveedores, utileros y caja chica</p>
        </div>

        <div className="p-5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
            Balance
          </p>
          <p
            className={`mt-1 text-2xl font-semibold tabular-nums ${
              balance >= 0 ? "text-neutral-900" : "text-rose-600"
            }`}
          >
            {money(balance)}
          </p>
          <p className="mt-2 text-xs text-neutral-500">Cobrado menos egresos</p>
        </div>
      </div>
    </section>
  );
}

export type PresupuestoLink = {
  id: string;
  evento: string;
  total: number;
  presupuestoNro: string | null;
  createdAt: Date;
};

/** Presupuestos asociados al evento, para saltar al que corresponda. */
export function PresupuestosDelEvento({
  presupuestos,
  eventoId,
}: {
  presupuestos: PresupuestoLink[];
  eventoId: string;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-5 py-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
            Comercial
          </p>
          <h3 className="text-sm font-semibold text-neutral-900">Presupuestos</h3>
        </div>
        <Link
          href={`/presupuestos/nuevo?eventoId=${eventoId}`}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-[13px] font-medium text-neutral-700 transition hover:bg-neutral-50"
        >
          Nuevo
        </Link>
      </div>

      {presupuestos.length === 0 ? (
        <p className="px-5 py-8 text-center text-[13px] text-neutral-500">
          Este evento todavía no tiene presupuestos.
        </p>
      ) : (
        <ul className="divide-y divide-neutral-100">
          {presupuestos.map((p) => (
            <li key={p.id}>
              <Link
                href={`/presupuestos/${p.id}`}
                className="flex items-center justify-between gap-4 px-5 py-3 transition hover:bg-neutral-50"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium text-neutral-900">
                    {p.presupuestoNro ? `Nº ${p.presupuestoNro}` : "Sin numerar"}
                  </span>
                  <span className="mt-0.5 block text-xs text-neutral-500">
                    {new Date(p.createdAt).toLocaleDateString("es-AR")}
                  </span>
                </span>
                <span className="shrink-0 text-[13px] font-semibold tabular-nums text-neutral-900">
                  {money(p.total)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
