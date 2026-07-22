import Link from "next/link";
import type { HomeOperativoInsights } from "@/lib/home-operativo-insights";
import type { EventosPermisos } from "@/lib/permisos";
import { CAJA_SENTIDO_INGRESO } from "@/lib/caja-chica-pesos";

const ESTADO_LABEL: Record<string, string> = {
  BORRADOR: "Borrador",
  CONFIRMADO: "Confirmado",
  EN_CURSO: "En curso",
  FINALIZADO: "Finalizado",
  FACTURADO: "Facturado",
};

const ESTADO_STYLE: Record<string, string> = {
  BORRADOR: "bg-neutral-100 text-neutral-600",
  CONFIRMADO: "bg-amber-100 text-amber-800",
  EN_CURSO: "bg-sky-100 text-sky-800",
  FINALIZADO: "bg-violet-100 text-violet-800",
  FACTURADO: "bg-emerald-100 text-emerald-800",
};

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
    <section className="mb-10 rounded-2xl border border-teal-200/70 bg-gradient-to-br from-teal-50/90 via-white to-sky-50/70 shadow-[0_1px_0_rgba(15,118,110,0.06)] overflow-hidden">
      <div className="relative px-6 sm:px-8 pt-8 pb-6 border-b border-teal-100/80">
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-teal-200/25 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-10 top-10 h-40 w-40 rounded-full bg-sky-200/20 blur-2xl"
          aria-hidden
        />
        <p className="relative text-teal-800/80 text-xs font-semibold uppercase tracking-[0.14em]">
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
        <div className="rounded-xl bg-white/80 border border-teal-100/90 px-4 py-3 shadow-sm min-w-[140px] flex-1">
          <p className="text-[11px] font-semibold text-teal-700/80 uppercase tracking-wider">Este mes</p>
          <p className="text-2xl font-bold text-neutral-900 tabular-nums mt-0.5">{insights.eventosMes}</p>
          <p className="text-xs text-neutral-500 mt-1">Eventos con fecha en el mes</p>
        </div>
        <div className="rounded-xl bg-white/80 border border-teal-100/90 px-4 py-3 shadow-sm min-w-[140px] flex-1">
          <p className="text-[11px] font-semibold text-teal-700/80 uppercase tracking-wider">En foco</p>
          <p className="text-2xl font-bold text-neutral-900 tabular-nums mt-0.5">{insights.eventosEnFoco}</p>
          <p className="text-xs text-neutral-500 mt-1">Confirmados o en curso</p>
        </div>
        {verCompromisos && (
          <div className="rounded-xl bg-white/80 border border-amber-100/90 px-4 py-3 shadow-sm min-w-[140px] flex-1">
            <p className="text-[11px] font-semibold text-amber-800/90 uppercase tracking-wider">Cotizaciones</p>
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
          <div className="rounded-xl bg-white/80 border border-emerald-100/90 px-4 py-3 shadow-sm min-w-[140px] flex-1">
            <p className="text-[11px] font-semibold text-emerald-800/90 uppercase tracking-wider">Caja chica</p>
            <p className="text-2xl font-bold text-neutral-900 tabular-nums mt-0.5">
              {insights.cajaMovimientosUltimos7Dias}
            </p>
            <p className="text-xs text-neutral-500 mt-1">Movimientos · últimos 7 días</p>
          </div>
        )}
        {verUtileros && (
          <div className="rounded-xl bg-white/80 border border-violet-100/90 px-4 py-3 shadow-sm min-w-[140px] flex-1">
            <p className="text-[11px] font-semibold text-violet-800/90 uppercase tracking-wider">Utileros</p>
            <p className="text-2xl font-bold text-neutral-900 tabular-nums mt-0.5">
              {insights.tareasUtilerosProximas}
            </p>
            <p className="text-xs text-neutral-500 mt-1">Tareas · próx. 3 semanas</p>
          </div>
        )}
      </div>

      {bullets.length > 0 && (
        <div className="px-6 sm:px-8 pb-2">
          <ul className="rounded-xl bg-teal-900/[0.04] border border-teal-200/50 px-4 py-3 space-y-2">
            {bullets.map((b, i) => (
              <li key={i} className="flex gap-2 text-sm text-neutral-700 leading-snug">
                <span className="text-teal-600 font-bold shrink-0 mt-0.5">→</span>
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
              className="text-xs font-medium text-teal-700 hover:text-teal-900 transition-colors"
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
                    className="flex items-start justify-between gap-3 rounded-xl border border-neutral-200/80 bg-white/90 px-4 py-3 shadow-sm hover:border-teal-300/80 hover:shadow transition-all group"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-neutral-900 group-hover:text-teal-900 truncate">
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
                    <span
                      className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-md ${
                        ESTADO_STYLE[e.estado] ?? "bg-neutral-100 text-neutral-600"
                      }`}
                    >
                      {ESTADO_LABEL[e.estado] ?? e.estado}
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
            <p className="text-sm text-neutral-600 leading-relaxed rounded-xl border border-violet-100 bg-violet-50/40 px-4 py-4">
              Tenés <strong>{insights.tareasUtilerosProximas}</strong> tarea
              {insights.tareasUtilerosProximas === 1 ? "" : "s"} cargada
              {insights.tareasUtilerosProximas === 1 ? "" : "s"} en eventos de las próximas semanas. Abrí cada evento
              y revisá la pestaña <strong>Utileros</strong>.
            </p>
          )}
          {!verCaja && !verUtileros && (
            <p className="text-sm text-neutral-600 leading-relaxed rounded-xl border border-neutral-200 bg-white/60 px-4 py-4">
              Entrá a <Link href="/eventos" className="font-semibold text-teal-700 hover:underline">Eventos</Link> para
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
                      className="block rounded-xl border border-neutral-200/80 bg-white/90 px-4 py-3 shadow-sm hover:border-emerald-300/70 transition-all"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-emerald-800 truncate">{c.eventoNombre}</p>
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
