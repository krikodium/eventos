import Link from "next/link";
import { EstadoEventoBadge } from "@/components/ui/estado-badge";
import type { HomeOperativoInsights } from "@/lib/home-operativo-insights";
import type { EventosPermisos } from "@/lib/permisos";
import { CAJA_SENTIDO_INGRESO } from "@/lib/caja-chica-pesos";


function fmtMoney(v: number) {
  return `$${v.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

type Props = {
  firstName: string;
  insights: HomeOperativoInsights;
  permisos: EventosPermisos;
};

export function HomeOperativoPanel({ firstName, insights, permisos }: Props) {
  const verCompromisos = permisos.cargaCompromisosProveedor;
  const verCaja = permisos.cajaChicaVer;
  const verUtileros = permisos.planillaUtilerosAgregar || permisos.planillaUtilerosEditarTareas;

  const totalCompromisosActivos =
    insights.compromisosPendientes + insights.compromisosParciales + insights.compromisosPagados;

  const bullets: string[] = [];
  if (verCompromisos && insights.compromisosPendientes > 0) {
    bullets.push(
      `${insights.compromisosPendientes} cotización${insights.compromisosPendientes === 1 ? "" : "es"} sin pagos registrados aún.`
    );
  }
  if (verCompromisos && insights.compromisosParciales > 0) {
    bullets.push(
      `${insights.compromisosParciales} cotización${insights.compromisosParciales === 1 ? "" : "es"} con pago parcial — revisá el saldo en cada evento.`
    );
  }
  if (verCaja && insights.cajaMovimientosUltimos7Dias > 0) {
    bullets.push(
      `${insights.cajaMovimientosUltimos7Dias} movimiento${insights.cajaMovimientosUltimos7Dias === 1 ? "" : "s"} de caja chica registrado${insights.cajaMovimientosUltimos7Dias === 1 ? "" : "s"} en los últimos 7 días.`
    );
  }
  if (verUtileros && insights.tareasUtilerosProximas > 0) {
    bullets.push(
      `${insights.tareasUtilerosProximas} tarea${insights.tareasUtilerosProximas === 1 ? "" : "s"} de utileros en eventos de las próximas tres semanas.`
    );
  }
  if (bullets.length === 0 && insights.proximosEventos.length > 0) {
    bullets.push("Tenés eventos próximos: coordiná cotizaciones, caja chica y planilla a tiempo.");
  }
  if (bullets.length === 0 && insights.eventosEnFoco > 0) {
    bullets.push(`${insights.eventosEnFoco} evento${insights.eventosEnFoco === 1 ? "" : "s"} confirmado${insights.eventosEnFoco === 1 ? "" : "s"} o en curso.`);
  }

  return (
    <section className="mb-10 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="relative border-b border-neutral-100 px-6 pb-6 pt-8 sm:px-8">
        <p className="relative text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
          Tu panel operativo
        </p>
        <h2 className="relative mt-2 text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
          Hola, {firstName}
        </h2>
        <p className="relative mt-2 text-neutral-600 text-sm max-w-2xl leading-relaxed">
          Acá ves un resumen de lo que te interesa para coordinar eventos: fechas cercanas, cotizaciones, caja chica y
          utileros — sin números globales de facturación.
        </p>
      </div>

      <div className="px-6 sm:px-8 py-6 flex flex-wrap gap-3">
        <div className="min-w-[140px] flex-1 rounded-xl border border-neutral-200 bg-neutral-50/50 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Este mes</p>
          <p className="text-2xl font-bold text-neutral-900 tabular-nums mt-0.5">{insights.eventosMes}</p>
          <p className="text-xs text-neutral-500 mt-1">Eventos con fecha en el mes</p>
        </div>
        <div className="min-w-[140px] flex-1 rounded-xl border border-neutral-200 bg-neutral-50/50 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">En foco</p>
          <p className="text-2xl font-bold text-neutral-900 tabular-nums mt-0.5">{insights.eventosEnFoco}</p>
          <p className="text-xs text-neutral-500 mt-1">Confirmados o en curso</p>
        </div>
        {verCompromisos && (
          <div className="min-w-[140px] flex-1 rounded-xl border border-neutral-200 bg-neutral-50/50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Cotizaciones</p>
            <p className="text-2xl font-bold text-neutral-900 tabular-nums mt-0.5">
              {insights.compromisosPendientes + insights.compromisosParciales}
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              {insights.compromisosPendientes} pend. · {insights.compromisosParciales} parcial
              {totalCompromisosActivos > 0 ? ` · ${insights.compromisosPagados} al día` : ""}
            </p>
          </div>
        )}
        {verCaja && (
          <div className="min-w-[140px] flex-1 rounded-xl border border-neutral-200 bg-neutral-50/50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Caja chica</p>
            <p className="text-2xl font-bold text-neutral-900 tabular-nums mt-0.5">
              {insights.cajaMovimientosUltimos7Dias}
            </p>
            <p className="text-xs text-neutral-500 mt-1">Movimientos · últimos 7 días</p>
          </div>
        )}
        {verUtileros && (
          <div className="min-w-[140px] flex-1 rounded-xl border border-neutral-200 bg-neutral-50/50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Utileros</p>
            <p className="text-2xl font-bold text-neutral-900 tabular-nums mt-0.5">
              {insights.tareasUtilerosProximas}
            </p>
            <p className="text-xs text-neutral-500 mt-1">Tareas · próx. 3 semanas</p>
          </div>
        )}
      </div>

      {bullets.length > 0 && (
        <div className="px-6 sm:px-8 pb-2">
          <ul className="space-y-2 rounded-xl border border-neutral-200 bg-neutral-50/60 px-4 py-3">
            {bullets.map((b, i) => (
              <li key={i} className="flex gap-2 text-sm text-neutral-700 leading-snug">
                <span className="mt-0.5 shrink-0 font-bold text-neutral-400">→</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="px-6 sm:px-8 pb-8 grid lg:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="text-sm font-semibold text-neutral-900">Próximos en el calendario</h3>
            <Link
              href="/eventos"
              className="text-xs font-medium text-neutral-500 transition-colors hover:text-neutral-900"
            >
              Todos los eventos →
            </Link>
          </div>
          {insights.proximosEventos.length === 0 ? (
            <p className="text-sm text-neutral-500 py-8 px-4 rounded-xl border border-dashed border-neutral-200 bg-white/50 text-center">
              No hay fechas en las próximas tres semanas. Cuando se carguen eventos, aparecen acá ordenados.
            </p>
          ) : (
            <ul className="space-y-2">
              {insights.proximosEventos.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/eventos/${e.id}`}
                    className="group flex items-start justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 transition-all hover:border-neutral-300 hover:shadow-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-neutral-900">
                        {e.nombre}
                      </p>
                      <p className="text-xs text-neutral-500 mt-0.5 truncate">{e.cliente}</p>
                      <p className="text-xs text-neutral-400 mt-1 tabular-nums">
                        {new Date(e.fecha).toLocaleDateString("es-AR", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>
                    <span className="shrink-0">
                      <EstadoEventoBadge estado={e.estado} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-neutral-900 mb-3">
            {verCaja
              ? "Actividad reciente en caja chica"
              : verUtileros
                ? "Utileros en la ventana próxima"
                : "Tu próximo paso"}
          </h3>
          {!verCaja && verUtileros && (
            <p className="rounded-xl border border-neutral-200 bg-neutral-50/60 px-4 py-4 text-sm leading-relaxed text-neutral-600">
              Tenés <strong>{insights.tareasUtilerosProximas}</strong> tarea
              {insights.tareasUtilerosProximas === 1 ? "" : "s"} cargada
              {insights.tareasUtilerosProximas === 1 ? "" : "s"} en eventos de las próximas semanas. Abrí cada evento
              y revisá la pestaña <strong>Utileros</strong>.
            </p>
          )}
          {!verCaja && !verUtileros && (
            <p className="text-sm text-neutral-600 leading-relaxed rounded-xl border border-neutral-200 bg-white/60 px-4 py-4">
              Entrá a <Link href="/eventos" className="font-semibold text-neutral-900 hover:underline">Eventos</Link> para
              ver el detalle de cada fecha y cargar la información que te corresponde.
            </p>
          )}
          {verCaja && insights.ultimosMovimientosCaja.length === 0 ? (
            <p className="text-sm text-neutral-500 py-8 px-4 rounded-xl border border-dashed border-neutral-200 bg-white/50 text-center">
              Todavía no hay movimientos de caja chica registrados.
            </p>
          ) : verCaja ? (
            <ul className="space-y-2">
              {insights.ultimosMovimientosCaja.map((c) => {
                const ing = c.sentido === CAJA_SENTIDO_INGRESO;
                return (
                  <li key={c.id}>
                    <Link
                      href={`/eventos/${c.eventoId}`}
                      className="block rounded-xl border border-neutral-200 bg-white px-4 py-3 transition-all hover:border-neutral-300 hover:shadow-sm"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-neutral-800">{c.eventoNombre}</p>
                          <span
                            className={`inline-block mt-1 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                              ing ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {ing ? "Ingreso" : "Egreso"}
                          </span>
                          {c.concepto && (
                            <p className="text-sm text-neutral-700 mt-0.5 line-clamp-2">{c.concepto}</p>
                          )}
                          <p className="text-[11px] text-neutral-400 mt-1">
                            {new Date(c.fecha).toLocaleString("es-AR", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <span
                          className={`text-sm font-bold tabular-nums shrink-0 ${ing ? "text-emerald-700" : "text-rose-700"}`}
                        >
                          {ing ? "+" : "−"}
                          {fmtMoney(c.monto)}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}
