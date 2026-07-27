"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type EventoResumen = {
  id: string;
  nombre: string;
  cliente: string;
  fecha: string;
  fechaFin: string | null;
  estado: string;
  tipo: string;
};

type TareaUtilero = {
  id: string;
  tipo: string;
  dias: number;
  monto: number;
  createdAt: string;
  evento: EventoResumen;
};

type AsignacionUtilero = {
  id: string;
  eventoId: string;
  anticipo: number;
  montoTransferencia: number | null;
  montoEfectivo: number | null;
  evento: EventoResumen;
};

export type UtileroHistorial = {
  id: string;
  nombre: string;
  tarifaPorDia: number;
  tarifaArmado: number | null;
  tarifaDesarmeEvento: number | null;
  tarifaDesarmeDepo: number | null;
  tarifaGuardia: number | null;
  tareas: TareaUtilero[];
  asignaciones: AsignacionUtilero[];
};

type TabId = "resumen" | "historial" | "cotizacion";
type TarifasForm = {
  nombre: string;
  tarifaPorDia: string;
  tarifaArmado: string;
  tarifaDesarmeEvento: string;
  tarifaDesarmeDepo: string;
  tarifaGuardia: string;
};
type Cantidades = {
  evento: number;
  armado: number;
  guardia: number;
  desarmeEvento: number;
  desarmeDepo: number;
};

const TIPOS_LABEL: Record<string, string> = {
  ARMADO: "Armado",
  ARMADO_1: "Armado 1",
  ARMADO_2: "Armado 2",
  GUARDIA: "Guardia",
  EVENTO: "Día de evento",
  DESARME_EVENTO: "Desarme en evento",
  DESARME_DEPO: "Desarme en depósito",
};

const ESTADOS_LABEL: Record<string, string> = {
  BORRADOR: "Borrador",
  CONFIRMADO: "Confirmado",
  EN_CURSO: "En curso",
  FINALIZADO: "Finalizado",
  FACTURADO: "Facturado",
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

const EMPTY_RATES: TarifasForm = {
  nombre: "",
  tarifaPorDia: "",
  tarifaArmado: "",
  tarifaDesarmeEvento: "",
  tarifaDesarmeDepo: "",
  tarifaGuardia: "",
};

const EMPTY_QUOTE: Cantidades = {
  evento: 1,
  armado: 0,
  guardia: 0,
  desarmeEvento: 0,
  desarmeDepo: 0,
};

function initials(nombre: string) {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function ratesForm(utilero: UtileroHistorial): TarifasForm {
  return {
    nombre: utilero.nombre,
    tarifaPorDia: String(utilero.tarifaPorDia),
    tarifaArmado: utilero.tarifaArmado == null ? "" : String(utilero.tarifaArmado),
    tarifaDesarmeEvento:
      utilero.tarifaDesarmeEvento == null ? "" : String(utilero.tarifaDesarmeEvento),
    tarifaDesarmeDepo:
      utilero.tarifaDesarmeDepo == null ? "" : String(utilero.tarifaDesarmeDepo),
    tarifaGuardia: utilero.tarifaGuardia == null ? "" : String(utilero.tarifaGuardia),
  };
}

function nullableNumber(value: string) {
  return value.trim() === "" ? null : Number(value);
}

function historialPorEvento(utilero: UtileroHistorial) {
  const eventos = new Map<
    string,
    {
      evento: EventoResumen;
      tareas: TareaUtilero[];
      anticipo: number;
      transferencia: number;
      efectivo: number;
    }
  >();

  for (const asignacion of utilero.asignaciones) {
    eventos.set(asignacion.eventoId, {
      evento: asignacion.evento,
      tareas: [],
      anticipo: asignacion.anticipo,
      transferencia: asignacion.montoTransferencia ?? 0,
      efectivo: asignacion.montoEfectivo ?? 0,
    });
  }

  for (const tarea of utilero.tareas) {
    const current = eventos.get(tarea.evento.id) ?? {
      evento: tarea.evento,
      tareas: [],
      anticipo: 0,
      transferencia: 0,
      efectivo: 0,
    };
    current.tareas.push(tarea);
    eventos.set(tarea.evento.id, current);
  }

  return [...eventos.values()]
    .map((item) => ({
      ...item,
      total: item.tareas.reduce((sum, tarea) => sum + tarea.monto, 0),
      registrado: item.anticipo + item.transferencia + item.efectivo,
    }))
    .sort(
      (a, b) =>
        new Date(b.evento.fecha).getTime() - new Date(a.evento.fecha).getTime()
    );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
      <path
        d="M5 12h14m-5-5 5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function UtilerosWorkspace({
  initialUtileros,
  initialSelectedId,
}: {
  initialUtileros: UtileroHistorial[];
  initialSelectedId?: string;
}) {
  const [utileros, setUtileros] = useState(initialUtileros);
  const [selectedId, setSelectedId] = useState(
    initialUtileros.some((u) => u.id === initialSelectedId)
      ? initialSelectedId!
      : (initialUtileros[0]?.id ?? "")
  );
  const [tab, setTab] = useState<TabId>("resumen");
  const [query, setQuery] = useState("");
  const [historyQuery, setHistoryQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<TarifasForm>(EMPTY_RATES);
  const [editForm, setEditForm] = useState<TarifasForm>(EMPTY_RATES);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [quote, setQuote] = useState<Cantidades>(EMPTY_QUOTE);
  const [copied, setCopied] = useState(false);

  const selected = utileros.find((utilero) => utilero.id === selectedId) ?? null;
  const filteredUtileros = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    if (!normalized) return utileros;
    return utileros.filter((utilero) =>
      utilero.nombre.toLocaleLowerCase("es").includes(normalized)
    );
  }, [query, utileros]);

  const history = useMemo(
    () => (selected ? historialPorEvento(selected) : []),
    [selected]
  );
  const filteredHistory = useMemo(() => {
    const normalized = historyQuery.trim().toLocaleLowerCase("es");
    if (!normalized) return history;
    return history.filter(
      ({ evento, tareas }) =>
        evento.nombre.toLocaleLowerCase("es").includes(normalized) ||
        evento.cliente.toLocaleLowerCase("es").includes(normalized) ||
        tareas.some((tarea) =>
          (TIPOS_LABEL[tarea.tipo] ?? tarea.tipo)
            .toLocaleLowerCase("es")
            .includes(normalized)
        )
    );
  }, [history, historyQuery]);

  const totalHistorico = selected?.tareas.reduce((sum, tarea) => sum + tarea.monto, 0) ?? 0;
  const totalRegistrado =
    selected?.asignaciones.reduce(
      (sum, item) =>
        sum +
        item.anticipo +
        (item.montoTransferencia ?? 0) +
        (item.montoEfectivo ?? 0),
      0
    ) ?? 0;

  const quoteRows = selected
    ? [
        {
          key: "evento" as const,
          label: "Día de evento",
          detail: "Cantidad de jornadas",
          rate: selected.tarifaPorDia,
          inherited: false,
        },
        {
          key: "armado" as const,
          label: "Armado",
          detail: "Servicio de armado",
          rate: selected.tarifaArmado ?? selected.tarifaPorDia,
          inherited: selected.tarifaArmado == null,
        },
        {
          key: "guardia" as const,
          label: "Guardia",
          detail: "Jornada de guardia",
          rate: selected.tarifaGuardia ?? selected.tarifaPorDia,
          inherited: selected.tarifaGuardia == null,
        },
        {
          key: "desarmeEvento" as const,
          label: "Desarme en evento",
          detail: "Servicio al finalizar",
          rate: selected.tarifaDesarmeEvento ?? selected.tarifaPorDia,
          inherited: selected.tarifaDesarmeEvento == null,
        },
        {
          key: "desarmeDepo" as const,
          label: "Desarme en depósito",
          detail: "Servicio en depósito",
          rate: selected.tarifaDesarmeDepo ?? selected.tarifaPorDia,
          inherited: selected.tarifaDesarmeDepo == null,
        },
      ]
    : [];
  const quoteTotal = quoteRows.reduce(
    (sum, row) => sum + row.rate * quote[row.key],
    0
  );

  function selectUtilero(id: string) {
    setSelectedId(id);
    setTab("resumen");
    setEditing(false);
    setHistoryQuery("");
    setQuote(EMPTY_QUOTE);
    setCopied(false);
    setError("");
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("utilero", id);
    window.history.replaceState(null, "", nextUrl);
  }

  async function createUtilero(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!createForm.nombre.trim() || !createForm.tarifaPorDia) {
      setError("Ingresá el nombre y la tarifa del día de evento.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/utileros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: createForm.nombre.trim(),
          tarifaPorDia: Number(createForm.tarifaPorDia),
          tarifaArmado: nullableNumber(createForm.tarifaArmado),
          tarifaDesarmeEvento: nullableNumber(createForm.tarifaDesarmeEvento),
          tarifaDesarmeDepo: nullableNumber(createForm.tarifaDesarmeDepo),
          tarifaGuardia: nullableNumber(createForm.tarifaGuardia),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se pudo crear el utilero.");
      const created: UtileroHistorial = {
        ...result,
        tareas: [],
        asignaciones: [],
      };
      setUtileros((current) =>
        [...current, created].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
      );
      setCreateForm(EMPTY_RATES);
      setShowCreate(false);
      selectUtilero(created.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo crear el utilero.");
    } finally {
      setSaving(false);
    }
  }

  function beginEdit() {
    if (!selected) return;
    setEditForm(ratesForm(selected));
    setEditing(true);
    setTab("cotizacion");
    setError("");
  }

  async function updateUtilero(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setError("");
    if (!editForm.nombre.trim() || !editForm.tarifaPorDia) {
      setError("El nombre y la tarifa del día de evento son obligatorios.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/utileros/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: editForm.nombre.trim(),
          tarifaPorDia: Number(editForm.tarifaPorDia),
          tarifaArmado: nullableNumber(editForm.tarifaArmado),
          tarifaDesarmeEvento: nullableNumber(editForm.tarifaDesarmeEvento),
          tarifaDesarmeDepo: nullableNumber(editForm.tarifaDesarmeDepo),
          tarifaGuardia: nullableNumber(editForm.tarifaGuardia),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se pudo actualizar.");
      setUtileros((current) =>
        current
          .map((utilero) =>
            utilero.id === selected.id ? { ...utilero, ...result } : utilero
          )
          .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
      );
      setEditing(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar.");
    } finally {
      setSaving(false);
    }
  }

  async function copyQuote() {
    if (!selected) return;
    const detail = quoteRows
      .filter((row) => quote[row.key] > 0)
      .map(
        (row) =>
          `${row.label}: ${quote[row.key]} × ${money.format(row.rate)} = ${money.format(
            quote[row.key] * row.rate
          )}`
      );
    const text = [
      `Cotización de ${selected.nombre}`,
      ...detail,
      `Total estimado: ${money.format(quoteTotal)}`,
    ].join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="mt-6 grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)] xl:items-start">
      <aside className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm xl:sticky xl:top-20">
        <div className="border-b border-neutral-100 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                Equipo
              </p>
              <p className="mt-1 text-sm text-neutral-600">
                {utileros.length} personas registradas
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowCreate((value) => !value);
                setError("");
              }}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-neutral-900 px-3 text-xs font-semibold text-white transition hover:bg-neutral-800"
            >
              <span className="text-lg font-light leading-none">+</span>
              Nuevo
            </button>
          </div>
          <label className="relative mt-4 block">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-neutral-400">
              <SearchIcon />
            </span>
            <span className="sr-only">Buscar utilero</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nombre"
              className="h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-9 pr-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-400 focus:bg-white focus:ring-2 focus:ring-neutral-100"
            />
          </label>
        </div>

        {showCreate && (
          <form onSubmit={createUtilero} className="border-b border-neutral-200 bg-neutral-50 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-900">Nuevo utilero</h2>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="text-xs font-medium text-neutral-500 hover:text-neutral-900"
              >
                Cerrar
              </button>
            </div>
            <div className="mt-3 space-y-3">
              <Field
                label="Nombre"
                value={createForm.nombre}
                onChange={(value) => setCreateForm({ ...createForm, nombre: value })}
                placeholder="Nombre y apellido"
              />
              <Field
                label="Día de evento"
                value={createForm.tarifaPorDia}
                onChange={(value) => setCreateForm({ ...createForm, tarifaPorDia: value })}
                type="number"
                placeholder="0"
              />
              <div className="grid grid-cols-2 gap-2">
                <Field
                  label="Armado"
                  value={createForm.tarifaArmado}
                  onChange={(value) => setCreateForm({ ...createForm, tarifaArmado: value })}
                  type="number"
                  placeholder="Opcional"
                />
                <Field
                  label="Guardia"
                  value={createForm.tarifaGuardia}
                  onChange={(value) => setCreateForm({ ...createForm, tarifaGuardia: value })}
                  type="number"
                  placeholder="Opcional"
                />
                <Field
                  label="Des. evento"
                  value={createForm.tarifaDesarmeEvento}
                  onChange={(value) =>
                    setCreateForm({ ...createForm, tarifaDesarmeEvento: value })
                  }
                  type="number"
                  placeholder="Opcional"
                />
                <Field
                  label="Des. depósito"
                  value={createForm.tarifaDesarmeDepo}
                  onChange={(value) =>
                    setCreateForm({ ...createForm, tarifaDesarmeDepo: value })
                  }
                  type="number"
                  placeholder="Opcional"
                />
              </div>
            </div>
            {error && <p className="mt-3 text-xs font-medium text-rose-600">{error}</p>}
            <button
              type="submit"
              disabled={saving}
              className="mt-4 h-10 w-full rounded-xl bg-neutral-900 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Crear utilero"}
            </button>
          </form>
        )}

        <div className="max-h-[440px] overflow-y-auto xl:max-h-[calc(100vh-270px)]">
          {filteredUtileros.map((utilero) => {
            const events = new Set(utilero.tareas.map((tarea) => tarea.evento.id)).size;
            const historical = utilero.tareas.reduce((sum, tarea) => sum + tarea.monto, 0);
            const active = utilero.id === selectedId;
            return (
              <button
                key={utilero.id}
                type="button"
                onClick={() => selectUtilero(utilero.id)}
                className={`grid w-full grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 border-b border-neutral-100 px-4 py-3.5 text-left transition ${
                  active
                    ? "border-l-2 border-l-neutral-900 bg-neutral-100"
                    : "border-l-2 border-l-transparent hover:bg-neutral-50"
                }`}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 bg-white text-xs font-bold text-neutral-700 shadow-sm">
                  {initials(utilero.nombre)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-neutral-900">
                    {utilero.nombre}
                  </span>
                  <span className="mt-0.5 block text-xs text-neutral-500">
                    {events} {events === 1 ? "evento" : "eventos"} · {money.format(historical)}
                  </span>
                </span>
                <span className="text-neutral-400">
                  <ArrowIcon />
                </span>
              </button>
            );
          })}
          {filteredUtileros.length === 0 && (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-medium text-neutral-700">Sin resultados</p>
              <p className="mt-1 text-xs text-neutral-500">Probá con otro nombre.</p>
            </div>
          )}
        </div>
      </aside>

      {selected ? (
        <section className="min-w-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <header className="px-5 py-6 sm:px-7">
            <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-100 text-base font-bold text-neutral-800">
                  {initials(selected.nombre)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-neutral-500">
                    Ficha de utilero
                  </p>
                  <h2 className="mt-1 truncate text-2xl font-semibold tracking-tight text-neutral-950">
                    {selected.nombre}
                  </h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    Tarifas, cotizaciones e historial operativo en un solo lugar.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={beginEdit}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-800 shadow-sm transition hover:bg-neutral-50"
              >
                Editar ficha y tarifas
              </button>
            </div>
          </header>

          <div className="grid border-y border-neutral-200 bg-neutral-50 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-neutral-200">
            <Metric
              label="Eventos"
              value={String(history.length)}
              detail="participaciones registradas"
            />
            <Metric
              label="Tareas"
              value={String(selected.tareas.length)}
              detail="servicios históricos"
            />
            <Metric
              label="Trabajo cotizado"
              value={money.format(totalHistorico)}
              detail="suma histórica"
            />
            <Metric
              label="Pagos registrados"
              value={money.format(totalRegistrado)}
              detail="anticipos y movimientos"
            />
          </div>

          <nav
            className="flex gap-1 overflow-x-auto border-b border-neutral-200 px-4 pt-3 sm:px-7"
            role="tablist"
            aria-label="Secciones del utilero"
          >
            {(
              [
                ["resumen", "Resumen"],
                ["historial", `Historial (${history.length})`],
                ["cotizacion", "Tarifas y cotización"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => {
                  setTab(id);
                  setError("");
                }}
                className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold transition ${
                  tab === id
                    ? "border-neutral-900 text-neutral-950"
                    : "border-transparent text-neutral-500 hover:text-neutral-800"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="p-5 sm:p-7">
            {tab === "resumen" && (
              <div className="grid gap-7 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <section>
                  <SectionHeading
                    eyebrow="Valores vigentes"
                    title="Tarifario actual"
                    description="Los valores específicos reemplazan la tarifa diaria al cargar una tarea."
                  />
                  <div className="mt-5 overflow-hidden rounded-xl border border-neutral-200">
                    <RateRow label="Día de evento" value={selected.tarifaPorDia} />
                    <RateRow
                      label="Armado"
                      value={selected.tarifaArmado}
                      fallback={selected.tarifaPorDia}
                    />
                    <RateRow
                      label="Guardia"
                      value={selected.tarifaGuardia}
                      fallback={selected.tarifaPorDia}
                    />
                    <RateRow
                      label="Desarme en evento"
                      value={selected.tarifaDesarmeEvento}
                      fallback={selected.tarifaPorDia}
                    />
                    <RateRow
                      label="Desarme en depósito"
                      value={selected.tarifaDesarmeDepo}
                      fallback={selected.tarifaPorDia}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setTab("cotizacion")}
                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-neutral-800 hover:text-neutral-950"
                  >
                    Armar una cotización <ArrowIcon />
                  </button>
                </section>

                <section>
                  <SectionHeading
                    eyebrow="Actividad reciente"
                    title="Últimos eventos"
                    description="Acceso rápido a las participaciones más recientes."
                  />
                  <div className="mt-5 divide-y divide-neutral-200 border-y border-neutral-200">
                    {history.slice(0, 4).map((item) => (
                      <Link
                        key={item.evento.id}
                        href={`/eventos/${item.evento.id}`}
                        className="grid gap-3 py-4 transition hover:bg-neutral-50 sm:grid-cols-[92px_minmax(0,1fr)_auto] sm:items-center sm:px-2"
                      >
                        <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                          {date.format(new Date(item.evento.fecha))}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-neutral-900">
                            {item.evento.nombre}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-neutral-500">
                            {item.evento.cliente} · {item.tareas.length}{" "}
                            {item.tareas.length === 1 ? "tarea" : "tareas"}
                          </span>
                        </span>
                        <span className="text-sm font-semibold tabular-nums text-neutral-900">
                          {money.format(item.total)}
                        </span>
                      </Link>
                    ))}
                    {history.length === 0 && (
                      <div className="py-10 text-center">
                        <p className="text-sm font-medium text-neutral-700">
                          Todavía no tiene eventos registrados
                        </p>
                        <p className="mt-1 text-xs text-neutral-500">
                          Las tareas aparecerán cuando se asignen desde un evento.
                        </p>
                      </div>
                    )}
                  </div>
                  {history.length > 4 && (
                    <button
                      type="button"
                      onClick={() => setTab("historial")}
                      className="mt-4 text-sm font-semibold text-neutral-800 hover:text-neutral-950"
                    >
                      Ver historial completo
                    </button>
                  )}
                </section>
              </div>
            )}

            {tab === "historial" && (
              <section>
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                  <SectionHeading
                    eyebrow="Registro operativo"
                    title="Historial de eventos y tareas"
                    description="Cada participación agrupada por evento, con tareas, importes y pagos registrados."
                  />
                  <label className="relative block w-full md:w-72">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-neutral-400">
                      <SearchIcon />
                    </span>
                    <span className="sr-only">Buscar en el historial</span>
                    <input
                      value={historyQuery}
                      onChange={(event) => setHistoryQuery(event.target.value)}
                      placeholder="Evento, cliente o tarea"
                      className="h-10 w-full rounded-xl border border-neutral-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100"
                    />
                  </label>
                </div>

                <div className="mt-6 overflow-hidden rounded-xl border border-neutral-200">
                  {filteredHistory.map((item, index) => {
                    const pendiente = Math.max(0, item.total - item.registrado);
                    return (
                      <article
                        key={item.evento.id}
                        className={`p-5 sm:p-6 ${index ? "border-t border-neutral-200" : ""}`}
                      >
                        <div className="grid gap-5 lg:grid-cols-[115px_minmax(0,1fr)_180px]">
                          <div>
                            <p className="text-sm font-semibold text-neutral-900">
                              {date.format(new Date(item.evento.fecha))}
                            </p>
                            <span className="mt-2 inline-flex rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-[11px] font-semibold text-neutral-600">
                              {ESTADOS_LABEL[item.evento.estado] ?? item.evento.estado}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <Link
                                  href={`/eventos/${item.evento.id}`}
                                  className="text-base font-semibold text-neutral-950 hover:underline"
                                >
                                  {item.evento.nombre}
                                </Link>
                                <p className="mt-1 text-sm text-neutral-500">
                                  {item.evento.cliente}
                                </p>
                              </div>
                              <Link
                                href={`/eventos/${item.evento.id}`}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-950"
                              >
                                Abrir evento <ArrowIcon />
                              </Link>
                            </div>
                            <div className="mt-4 space-y-2">
                              {item.tareas.map((tarea) => (
                                <div
                                  key={tarea.id}
                                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-neutral-50 px-3.5 py-2.5"
                                >
                                  <span className="text-sm text-neutral-700">
                                    <strong className="font-semibold text-neutral-900">
                                      {TIPOS_LABEL[tarea.tipo] ?? tarea.tipo}
                                    </strong>
                                    {(tarea.tipo === "EVENTO" ||
                                      tarea.tipo === "ARMADO" ||
                                      tarea.tipo === "ARMADO_1" ||
                                      tarea.tipo === "ARMADO_2") && (
                                      <span className="ml-2 text-xs text-neutral-500">
                                        {tarea.dias} {tarea.dias === 1 ? "día" : "días"}
                                      </span>
                                    )}
                                  </span>
                                  <span className="text-sm font-semibold tabular-nums text-neutral-900">
                                    {money.format(tarea.monto)}
                                  </span>
                                </div>
                              ))}
                              {item.tareas.length === 0 && (
                                <p className="rounded-lg bg-neutral-50 px-3.5 py-3 text-sm text-neutral-500">
                                  Asignado al evento, sin tareas cargadas.
                                </p>
                              )}
                            </div>
                          </div>
                          <dl className="space-y-3 border-t border-neutral-200 pt-4 text-sm lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                            <div className="flex items-center justify-between gap-3">
                              <dt className="text-neutral-500">Cotizado</dt>
                              <dd className="font-semibold tabular-nums text-neutral-950">
                                {money.format(item.total)}
                              </dd>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <dt className="text-neutral-500">Registrado</dt>
                              <dd className="font-medium tabular-nums text-neutral-700">
                                {money.format(item.registrado)}
                              </dd>
                            </div>
                            <div className="flex items-center justify-between gap-3 border-t border-neutral-200 pt-3">
                              <dt className="font-medium text-neutral-700">Pendiente</dt>
                              <dd
                                className={`font-semibold tabular-nums ${
                                  pendiente > 0 ? "text-amber-700" : "text-emerald-700"
                                }`}
                              >
                                {money.format(pendiente)}
                              </dd>
                            </div>
                          </dl>
                        </div>
                      </article>
                    );
                  })}
                  {filteredHistory.length === 0 && (
                    <div className="px-6 py-16 text-center">
                      <p className="text-sm font-semibold text-neutral-800">
                        {history.length === 0
                          ? "No hay eventos registrados"
                          : "No encontramos coincidencias"}
                      </p>
                      <p className="mt-1 text-sm text-neutral-500">
                        {history.length === 0
                          ? "Las asignaciones aparecerán acá automáticamente."
                          : "Probá con otro evento, cliente o tarea."}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {tab === "cotizacion" && (
              <div className="space-y-8">
                <section>
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                    <SectionHeading
                      eyebrow="Configuración"
                      title="Ficha y tarifas vigentes"
                      description="Los campos vacíos toman como referencia el valor del día de evento."
                    />
                    {!editing && (
                      <button
                        type="button"
                        onClick={beginEdit}
                        className="h-10 rounded-xl border border-neutral-300 px-4 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
                      >
                        Editar valores
                      </button>
                    )}
                  </div>

                  {editing ? (
                    <form
                      onSubmit={updateUtilero}
                      className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50 p-5"
                    >
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="sm:col-span-2 lg:col-span-3">
                          <Field
                            label="Nombre"
                            value={editForm.nombre}
                            onChange={(value) => setEditForm({ ...editForm, nombre: value })}
                            placeholder="Nombre y apellido"
                          />
                        </div>
                        <Field
                          label="Día de evento"
                          value={editForm.tarifaPorDia}
                          onChange={(value) =>
                            setEditForm({ ...editForm, tarifaPorDia: value })
                          }
                          type="number"
                        />
                        <Field
                          label="Armado"
                          value={editForm.tarifaArmado}
                          onChange={(value) =>
                            setEditForm({ ...editForm, tarifaArmado: value })
                          }
                          type="number"
                          placeholder="Usa día de evento"
                        />
                        <Field
                          label="Guardia"
                          value={editForm.tarifaGuardia}
                          onChange={(value) =>
                            setEditForm({ ...editForm, tarifaGuardia: value })
                          }
                          type="number"
                          placeholder="Usa día de evento"
                        />
                        <Field
                          label="Desarme en evento"
                          value={editForm.tarifaDesarmeEvento}
                          onChange={(value) =>
                            setEditForm({ ...editForm, tarifaDesarmeEvento: value })
                          }
                          type="number"
                          placeholder="Usa día de evento"
                        />
                        <Field
                          label="Desarme en depósito"
                          value={editForm.tarifaDesarmeDepo}
                          onChange={(value) =>
                            setEditForm({ ...editForm, tarifaDesarmeDepo: value })
                          }
                          type="number"
                          placeholder="Usa día de evento"
                        />
                      </div>
                      {error && (
                        <p className="mt-4 text-sm font-medium text-rose-600">{error}</p>
                      )}
                      <div className="mt-5 flex flex-wrap gap-2">
                        <button
                          type="submit"
                          disabled={saving}
                          className="h-10 rounded-xl bg-neutral-900 px-4 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
                        >
                          {saving ? "Guardando..." : "Guardar cambios"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(false);
                            setError("");
                          }}
                          className="h-10 rounded-xl border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="mt-5 grid overflow-hidden rounded-xl border border-neutral-200 sm:grid-cols-2 lg:grid-cols-5 lg:divide-x lg:divide-neutral-200">
                      <CompactRate label="Día de evento" value={selected.tarifaPorDia} />
                      <CompactRate
                        label="Armado"
                        value={selected.tarifaArmado ?? selected.tarifaPorDia}
                        inherited={selected.tarifaArmado == null}
                      />
                      <CompactRate
                        label="Guardia"
                        value={selected.tarifaGuardia ?? selected.tarifaPorDia}
                        inherited={selected.tarifaGuardia == null}
                      />
                      <CompactRate
                        label="Des. evento"
                        value={selected.tarifaDesarmeEvento ?? selected.tarifaPorDia}
                        inherited={selected.tarifaDesarmeEvento == null}
                      />
                      <CompactRate
                        label="Des. depósito"
                        value={selected.tarifaDesarmeDepo ?? selected.tarifaPorDia}
                        inherited={selected.tarifaDesarmeDepo == null}
                      />
                    </div>
                  )}
                </section>

                <section className="border-t border-neutral-200 pt-8">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                    <SectionHeading
                      eyebrow="Simulador"
                      title="Cotización orientativa"
                      description="Combiná jornadas y tareas para obtener un estimado con las tarifas actuales."
                    />
                    <button
                      type="button"
                      onClick={copyQuote}
                      disabled={quoteTotal <= 0}
                      className="h-10 rounded-xl border border-neutral-300 px-4 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {copied ? "Cotización copiada" : "Copiar detalle"}
                    </button>
                  </div>
                  <div className="mt-5 overflow-hidden rounded-xl border border-neutral-200">
                    <div className="hidden grid-cols-[minmax(0,1fr)_140px_120px_150px] gap-4 border-b border-neutral-200 bg-neutral-50 px-5 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-neutral-500 md:grid">
                      <span>Trabajo</span>
                      <span className="text-right">Tarifa</span>
                      <span className="text-center">Cantidad</span>
                      <span className="text-right">Subtotal</span>
                    </div>
                    {quoteRows.map((row) => (
                      <div
                        key={row.key}
                        className="grid gap-3 border-b border-neutral-100 px-5 py-4 last:border-b-0 md:grid-cols-[minmax(0,1fr)_140px_120px_150px] md:items-center"
                      >
                        <div>
                          <p className="text-sm font-semibold text-neutral-900">{row.label}</p>
                          <p className="mt-0.5 text-xs text-neutral-500">
                            {row.detail}
                            {row.inherited ? " · usa tarifa diaria" : ""}
                          </p>
                        </div>
                        <p className="text-sm font-medium tabular-nums text-neutral-700 md:text-right">
                          {money.format(row.rate)}
                        </p>
                        <label className="flex items-center gap-2 md:justify-center">
                          <span className="text-xs text-neutral-500 md:sr-only">Cantidad</span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={quote[row.key]}
                            onChange={(event) =>
                              setQuote({
                                ...quote,
                                [row.key]: Math.max(0, Number(event.target.value) || 0),
                              })
                            }
                            className="h-9 w-20 rounded-lg border border-neutral-200 text-center text-sm font-semibold tabular-nums text-neutral-900 outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100"
                          />
                        </label>
                        <p className="text-right text-base font-semibold tabular-nums text-neutral-950">
                          {money.format(row.rate * quote[row.key])}
                        </p>
                      </div>
                    ))}
                    <div className="flex flex-col justify-between gap-2 border-t border-neutral-300 bg-neutral-50 px-5 py-5 sm:flex-row sm:items-center">
                      <div>
                        <p className="text-sm font-semibold text-neutral-900">Total estimado</p>
                        <p className="mt-0.5 text-xs text-neutral-500">
                          Referencia interna; no modifica ningún evento.
                        </p>
                      </div>
                      <p className="text-2xl font-semibold tracking-tight tabular-nums text-neutral-950">
                        {money.format(quoteTotal)}
                      </p>
                    </div>
                  </div>
                </section>
              </div>
            )}
          </div>
        </section>
      ) : (
        <section className="flex min-h-[520px] items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center">
          <div className="max-w-sm">
            <p className="text-lg font-semibold text-neutral-900">Todavía no hay utileros</p>
            <p className="mt-2 text-sm leading-6 text-neutral-500">
              Creá la primera ficha para registrar tarifas, cotizaciones y participaciones.
            </p>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="mt-5 h-10 rounded-xl bg-neutral-900 px-4 text-sm font-semibold text-white hover:bg-neutral-800"
            >
              Crear primer utilero
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number";
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-neutral-600">{label}</span>
      <input
        type={type}
        min={type === "number" ? "0" : undefined}
        step={type === "number" ? "1" : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100"
      />
    </label>
  );
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="border-b border-neutral-200 px-5 py-4 last:border-b-0 sm:border-b lg:border-b-0">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">{label}</p>
      <p className="mt-2 text-xl font-semibold tracking-tight tabular-nums text-neutral-950">
        {value}
      </p>
      <p className="mt-0.5 text-xs text-neutral-500">{detail}</p>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">{eyebrow}</p>
      <h3 className="mt-1 text-lg font-semibold tracking-tight text-neutral-950">{title}</h3>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-neutral-500">{description}</p>
    </div>
  );
}

function RateRow({
  label,
  value,
  fallback,
}: {
  label: string;
  value: number | null;
  fallback?: number;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-neutral-100 px-4 py-3.5 last:border-b-0">
      <div>
        <p className="text-sm font-medium text-neutral-800">{label}</p>
        {value == null && fallback != null && (
          <p className="mt-0.5 text-xs text-neutral-500">Usa tarifa del día de evento</p>
        )}
      </div>
      <p className="text-sm font-semibold tabular-nums text-neutral-950">
        {money.format(value ?? fallback ?? 0)}
      </p>
    </div>
  );
}

function CompactRate({
  label,
  value,
  inherited = false,
}: {
  label: string;
  value: number;
  inherited?: boolean;
}) {
  return (
    <div className="border-b border-neutral-200 px-4 py-4 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0 lg:border-b-0">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-neutral-500">{label}</p>
      <p className="mt-2 text-base font-semibold tabular-nums text-neutral-950">
        {money.format(value)}
      </p>
      <p className="mt-0.5 text-[11px] text-neutral-500">
        {inherited ? "Tarifa diaria" : "Valor específico"}
      </p>
    </div>
  );
}
