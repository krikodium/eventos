import Link from "next/link";
import { EstadoEventoBadge } from "@/components/ui/estado-badge";

type EventoConPresupuestos = {
  id: string;
  nombre: string;
  cliente: string;
  fecha: Date;
  estado: string;
  presupuestos: { id: string; total: number; createdAt: Date; presupuestoNro: string | null }[];
};

type PresupuestoLibre = {
  id: string;
  evento: string;
  cliente: string;
  total: number;
  presupuestoNro: string | null;
  createdAt: Date;
};

function money(value: number): string {
  return value.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });
}

function fechaCorta(value: Date): string {
  return new Date(value).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function PresupuestosLanding({
  eventos,
  libres,
}: {
  eventos: EventoConPresupuestos[];
  libres: PresupuestoLibre[];
}) {
  return (
    <div className="space-y-10">
      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="section-eyebrow">Eventos</p>
            <h2 className="text-lg font-semibold tracking-[-0.01em] text-neutral-950">
              Elegí un evento para presupuestar
            </h2>
          </div>
          <Link href="/presupuestos/nuevo" className="btn btn-secondary btn-sm">
            Presupuesto sin evento
          </Link>
        </div>

        {eventos.length === 0 ? (
          <div className="card px-6 py-12 text-center">
            <p className="text-sm text-neutral-500">
              Todavía no hay eventos cargados.
            </p>
            <div className="mt-4 flex justify-center gap-3">
              <Link href="/eventos/nuevo" className="btn btn-primary btn-sm">
                Crear evento
              </Link>
              <Link href="/presupuestos/nuevo" className="btn btn-secondary btn-sm">
                Presupuestar sin evento
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {eventos.map((evento) => {
              const total = evento.presupuestos.reduce((s, p) => s + p.total, 0);
              const cantidad = evento.presupuestos.length;
              return (
                <Link
                  key={evento.id}
                  href={`/presupuestos/nuevo?eventoId=${evento.id}`}
                  className="card-interactive group flex flex-col gap-4 p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-neutral-950">
                        {evento.nombre}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-neutral-500">{evento.cliente}</p>
                    </div>
                    <EstadoEventoBadge estado={evento.estado} />
                  </div>

                  <div className="flex items-end justify-between gap-3 border-t border-neutral-100 pt-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                        {cantidad === 0
                          ? "Sin presupuestos"
                          : `${cantidad} presupuesto${cantidad === 1 ? "" : "s"}`}
                      </p>
                      <p className="mt-0.5 text-sm font-semibold tabular-nums text-neutral-900">
                        {cantidad === 0 ? fechaCorta(evento.fecha) : money(total)}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-accent-600 transition group-hover:translate-x-0.5">
                      {cantidad === 0 ? "Presupuestar" : "Agregar"} →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {libres.length > 0 && (
        <section>
          <p className="section-eyebrow">Sin evento asignado</p>
          <h2 className="mb-4 text-lg font-semibold tracking-[-0.01em] text-neutral-950">
            Presupuestos libres
          </h2>
          <div className="table-wrap bg-white">
            <table className="table">
              <thead>
                <tr>
                  <th>Evento</th>
                  <th>Cliente</th>
                  <th>Nº</th>
                  <th>Creado</th>
                  <th className="text-right">Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {libres.map((p) => (
                  <tr key={p.id}>
                    <td className="font-medium text-neutral-900">
                      <Link
                        href={`/presupuestos/${p.id}`}
                        className="hover:underline"
                      >
                        {p.evento}
                      </Link>
                    </td>
                    <td>{p.cliente}</td>
                    <td>{p.presupuestoNro ?? "—"}</td>
                    <td>{fechaCorta(p.createdAt)}</td>
                    <td className="text-right font-semibold tabular-nums text-neutral-900">
                      {money(p.total)}
                    </td>
                    <td className="text-right">
                      <Link
                        href={`/presupuestos/${p.id}`}
                        className="whitespace-nowrap text-xs font-semibold text-accent-600 hover:text-accent-900"
                      >
                        Abrir →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
