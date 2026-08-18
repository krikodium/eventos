"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { EstadoEventoBadge } from "@/components/ui/estado-badge";
import { ESTADO_EVENTO, TIPO_EVENTO } from "@/lib/estados";
import { filtrarCartera, totalesCartera, type EventoCartera } from "@/lib/cartera-eventos";

type Cobranza = "todos" | "saldo" | "saldados" | "sin-presupuesto";
type Periodo = "todos" | "mes" | "proximos" | "pasados";
type Orden = "fecha" | "porCobrar" | "avance";

const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const compact = new Intl.NumberFormat("es-AR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const fechaFmt = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  year: "2-digit",
});

/** Barra de avance de cobranza: el ancho es el dato, el color es el estado. */
function BarraAvance({ avance }: { avance: number | null }) {
  if (avance === null) {
    return <div className="h-1.5 w-full rounded-full border border-dashed border-neutral-300" />;
  }
  const completo = avance >= 99.5;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
      <div
        className={`h-full rounded-full transition-[width] duration-500 ease-out ${
          completo ? "bg-emerald-500" : avance > 0 ? "bg-neutral-800" : "bg-neutral-300"
        }`}
        style={{ width: `${Math.max(avance > 0 ? 3 : 0, avance)}%` }}
      />
    </div>
  );
}

function Chip({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
        activo
          ? "bg-neutral-900 text-white shadow-sm"
          : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
      }`}
    >
      {children}
    </button>
  );
}

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

/** Desglose monetario del evento. Solo se arma al abrir la fila. */
function DetalleMonetario({ evento }: { evento: EventoCartera }) {
  const cobranza = [
    { label: "Presupuestado", valor: evento.presupuesto, tono: "text-neutral-900" },
    { label: "Cobrado", valor: evento.cobrado, tono: "text-emerald-700" },
    {
      label: "Por cobrar",
      valor: evento.porCobrar,
      tono: evento.porCobrar > 0 ? "text-amber-700" : "text-neutral-400",
    },
  ];
  const costos = [
    { label: "Proveedores", valor: evento.proveedores },
    { label: "Utileros", valor: evento.utileros },
    { label: "Caja chica", valor: evento.cajaChica },
  ].filter((c) => c.valor > 0);

  return (
    <div className="grid gap-x-10 gap-y-5 px-4 pb-5 sm:grid-cols-2 lg:grid-cols-3 lg:pl-[94px]">
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
          Cobranza
        </p>
        <dl className="divide-y divide-neutral-100 border-y border-neutral-100">
          {cobranza.map((f) => (
            <div key={f.label} className="flex items-center justify-between gap-4 py-2">
              <dt className="text-sm text-neutral-600">{f.label}</dt>
              <dd className={`text-sm font-semibold tabular-nums ${f.tono}`}>
                {money.format(f.valor)}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
          Costos registrados
        </p>
        {costos.length === 0 ? (
          <p className="border-y border-neutral-100 py-2 text-sm text-neutral-400">
            Sin costos cargados
          </p>
        ) : (
          <dl className="divide-y divide-neutral-100 border-y border-neutral-100">
            {costos.map((c) => (
              <div key={c.label} className="flex items-center justify-between gap-4 py-2">
                <dt className="text-sm text-neutral-600">{c.label}</dt>
                <dd className="text-sm font-medium tabular-nums text-neutral-900">
                  {money.format(c.valor)}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <div className="flex flex-col justify-between gap-4">
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
            Resultado a hoy
          </p>
          <p
            className={`text-2xl font-semibold tabular-nums ${
              evento.resultado >= 0 ? "text-neutral-950" : "text-rose-600"
            }`}
          >
            {money.format(evento.resultado)}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Cobrado menos costos
            {evento.margen !== null && ` · margen previsto ${evento.margen.toFixed(0)}%`}
          </p>
        </div>
        <Link
          href={`/eventos/${evento.id}`}
          className="text-xs font-semibold text-accent-600 transition hover:text-accent-900"
        >
          Abrir evento →
        </Link>
      </div>
    </div>
  );
}

function FilaEvento({ evento }: { evento: EventoCartera }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="border-b border-neutral-100 last:border-0">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex w-full items-center gap-4 px-4 py-3.5 text-left transition hover:bg-neutral-50"
      >
        <span className="w-[74px] shrink-0 text-xs font-medium uppercase tracking-wide text-neutral-500">
          {fechaFmt.format(new Date(evento.fecha))}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-neutral-950">
            {evento.nombre}
          </span>
          <span className="mt-0.5 block truncate text-xs text-neutral-500">{evento.cliente}</span>
        </span>

        <span className="hidden w-40 shrink-0 md:block">
          <span className="mb-1.5 flex items-baseline justify-between gap-2">
            <span className="text-[11px] font-medium text-neutral-500">
              {evento.avance === null ? "Sin presupuesto" : `${evento.avance.toFixed(0)}%`}
            </span>
            <span className="text-[11px] tabular-nums text-neutral-400">
              {compact.format(evento.cobrado)}
              {evento.presupuesto > 0 && ` / ${compact.format(evento.presupuesto)}`}
            </span>
          </span>
          <BarraAvance avance={evento.avance} />
        </span>

        <span className="hidden w-32 shrink-0 text-right lg:block">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
            Por cobrar
          </span>
          <span
            className={`block text-sm font-semibold tabular-nums ${
              evento.porCobrar > 0 ? "text-amber-700" : "text-neutral-400"
            }`}
          >
            {evento.presupuesto > 0 ? money.format(evento.porCobrar) : "—"}
          </span>
        </span>

        <span className="hidden shrink-0 sm:block">
          <EstadoEventoBadge estado={evento.estado} />
        </span>

        <Chevron abierto={abierto} />
      </button>

      {abierto && <DetalleMonetario evento={evento} />}
    </div>
  );
}

export function CarteraEventos({ eventos }: { eventos: EventoCartera[] }) {
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState<string>("todos");
  const [tipo, setTipo] = useState<string>("todos");
  const [cobranza, setCobranza] = useState<Cobranza>("todos");
  const [periodo, setPeriodo] = useState<Periodo>("todos");
  const [orden, setOrden] = useState<Orden>("fecha");

  const filtrados = useMemo(
    () => filtrarCartera(eventos, { busqueda, estado, tipo, cobranza, periodo, orden }),
    [eventos, busqueda, estado, tipo, cobranza, periodo, orden]
  );

  const totales = useMemo(() => totalesCartera(filtrados), [filtrados]);
  const hayFiltro =
    busqueda !== "" ||
    estado !== "todos" ||
    tipo !== "todos" ||
    cobranza !== "todos" ||
    periodo !== "todos";

  function limpiar() {
    setBusqueda("");
    setEstado("todos");
    setTipo("todos");
    setCobranza("todos");
    setPeriodo("todos");
  }

  const kpis = [
    {
      label: "Por cobrar",
      valor: money.format(totales.porCobrar),
      tono: totales.porCobrar > 0 ? "text-amber-700" : "text-neutral-900",
      extra: undefined as string | undefined,
    },
    {
      label: "Cobrado",
      valor: money.format(totales.cobrado),
      tono: "text-emerald-700",
      extra: totales.avance !== null ? `${totales.avance.toFixed(0)}% de lo presupuestado` : undefined,
    },
    {
      label: "Presupuestado",
      valor: money.format(totales.presupuesto),
      tono: "text-neutral-900",
      extra: undefined,
    },
    {
      label: "Eventos",
      valor: String(totales.eventos),
      tono: "text-neutral-900",
      extra: hayFiltro ? `de ${eventos.length} en total` : undefined,
    },
  ];

  return (
    <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <header className="border-b border-neutral-100 px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-500">
              Analítica
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-[-0.01em] text-neutral-950">
              Cartera de eventos
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Filtrá y mirá el detalle monetario sin entrar a cada evento.
            </p>
          </div>
          {hayFiltro && (
            <button
              type="button"
              onClick={limpiar}
              className="text-xs font-semibold text-neutral-500 underline-offset-4 transition hover:text-neutral-900 hover:underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Los totales se recalculan sobre lo filtrado: son la lectura del recorte. */}
        <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-neutral-200 bg-neutral-200 sm:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className="bg-white px-4 py-3">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                {k.label}
              </dt>
              <dd className={`mt-1 text-lg font-semibold tabular-nums ${k.tono}`}>{k.valor}</dd>
              {k.extra && <p className="mt-0.5 text-[11px] text-neutral-400">{k.extra}</p>}
            </div>
          ))}
        </dl>
      </header>

      <div className="flex flex-col gap-3 border-b border-neutral-100 bg-neutral-50/60 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar evento, cliente u organizadora"
            aria-label="Buscar en la cartera"
            className="h-10 min-w-[220px] flex-1 rounded-xl border border-neutral-200 bg-white px-3.5 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-4 focus:ring-neutral-900/10"
          />
          <select
            value={orden}
            onChange={(e) => setOrden(e.target.value as Orden)}
            aria-label="Ordenar por"
            className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none transition focus:border-neutral-400 focus:ring-4 focus:ring-neutral-900/10"
          >
            <option value="fecha">Más recientes</option>
            <option value="porCobrar">Mayor saldo por cobrar</option>
            <option value="avance">Menor avance de cobro</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="flex flex-wrap items-center gap-1">
            <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              Cobranza
            </span>
            {(
              [
                ["todos", "Todos"],
                ["saldo", "Con saldo"],
                ["saldados", "Saldados"],
                ["sin-presupuesto", "Sin presupuesto"],
              ] as const
            ).map(([id, label]) => (
              <Chip key={id} activo={cobranza === id} onClick={() => setCobranza(id)}>
                {label}
              </Chip>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1">
            <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              Fecha
            </span>
            {(
              [
                ["todos", "Todas"],
                ["mes", "Este mes"],
                ["proximos", "Próximos"],
                ["pasados", "Pasados"],
              ] as const
            ).map(([id, label]) => (
              <Chip key={id} activo={periodo === id} onClick={() => setPeriodo(id)}>
                {label}
              </Chip>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1">
            <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              Estado
            </span>
            <Chip activo={estado === "todos"} onClick={() => setEstado("todos")}>
              Todos
            </Chip>
            {Object.entries(ESTADO_EVENTO).map(([id, { label }]) => (
              <Chip key={id} activo={estado === id} onClick={() => setEstado(id)}>
                {label}
              </Chip>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1">
            <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              Tipo
            </span>
            <Chip activo={tipo === "todos"} onClick={() => setTipo("todos")}>
              Todos
            </Chip>
            {Object.entries(TIPO_EVENTO).map(([id, label]) => (
              <Chip key={id} activo={tipo === id} onClick={() => setTipo(id)}>
                {label}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      <div>
        {filtrados.map((evento) => (
          <FilaEvento key={evento.id} evento={evento} />
        ))}
        {filtrados.length === 0 && (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-semibold text-neutral-800">
              {eventos.length === 0 ? "Todavía no hay eventos" : "Ningún evento coincide"}
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              {eventos.length === 0
                ? "Cuando cargues eventos vas a ver acá su estado de cobranza."
                : "Probá aflojando los filtros."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
