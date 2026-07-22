import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

type EventosPageProps = {
  searchParams?: Promise<{
    q?: string;
    estado?: string;
    tipo?: string;
  }>;
};

export default async function EventosPage({ searchParams }: EventosPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isAdmin = session.user.role === "ADMIN";
  const params = await searchParams;
  const q = params?.q?.trim() ?? "";
  const estadoFiltro = params?.estado ?? "";
  const tipoFiltro = params?.tipo ?? "";

  const todosEventos = await prisma.evento.findMany({
    orderBy: { fecha: "desc" },
    include: {
      _count: { select: { pagosProveedores: true, diasUtileros: true, ingresos: true } },
    },
  });

  const estados: Record<string, string> = {
    BORRADOR: "Borrador",
    CONFIRMADO: "Confirmado",
    EN_CURSO: "En curso",
    FINALIZADO: "Finalizado",
    FACTURADO: "Facturado",
  };

  const tipos: Record<string, string> = {
    CORPORATIVO: "Corporativo",
    PARTICULAR: "Particular",
  };

  const normalizar = (v: string | null | undefined) => v?.toLowerCase().trim() ?? "";
  const eventos = todosEventos.filter((e) => {
    const coincideTexto =
      !q ||
      [e.nombre, e.cliente, e.organizadora, e.provincia, e.localidad, e.presupuestoNro].some(
        (value) => normalizar(value).includes(normalizar(q))
      );
    return coincideTexto && (!estadoFiltro || e.estado === estadoFiltro) && (!tipoFiltro || e.tipo === tipoFiltro);
  });

  const estadoStyle = (estado: string) => {
    switch (estado) {
      case "FACTURADO":
        return "bg-emerald-950 text-emerald-50 border-emerald-950";
      case "FINALIZADO":
        return "bg-neutral-200 text-neutral-700 border-neutral-200";
      case "EN_CURSO":
        return "bg-sky-100 text-sky-800 border-sky-200";
      case "CONFIRMADO":
        return "bg-teal-100 text-teal-800 border-teal-200";
      default:
        return "bg-amber-50 text-amber-800 border-amber-200";
    }
  };

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const proximos = todosEventos.filter((e) => new Date(e.fecha) >= hoy);
  const eventoMasCercano = proximos
    .slice()
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())[0];
  const eventosActivos = todosEventos.filter((e) => ["CONFIRMADO", "EN_CURSO"].includes(e.estado)).length;
  const eventosBorrador = todosEventos.filter((e) => e.estado === "BORRADOR").length;
  const eventosConActividad = todosEventos.filter(
    (e) => e._count.ingresos + e._count.pagosProveedores + e._count.diasUtileros > 0
  ).length;
  const totalPresupuestado = todosEventos.reduce((acc, e) => acc + (e.presupuestoTotal ?? 0), 0);
  const filtrosActivos = Boolean(q || estadoFiltro || tipoFiltro);

  const fmtMoney = (v: number) =>
    v > 0 ? `$${v.toLocaleString("es-AR", { maximumFractionDigits: 0 })}` : "-";
  const fmtDate = (d: Date) =>
    new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
  const diasHasta = (fecha: Date) => {
    const target = new Date(fecha);
    target.setHours(0, 0, 0, 0);
    const diff = Math.round((target.getTime() - hoy.getTime()) / 86_400_000);
    if (diff === 0) return "Hoy";
    if (diff === 1) return "Mañana";
    if (diff > 1) return `En ${diff} días`;
    if (diff === -1) return "Ayer";
    return `Hace ${Math.abs(diff)} días`;
  };

  const estadoBar = (estado: string) => {
    switch (estado) {
      case "FACTURADO":
        return "bg-emerald-500";
      case "FINALIZADO":
        return "bg-neutral-400";
      case "EN_CURSO":
        return "bg-sky-500";
      case "CONFIRMADO":
        return "bg-teal-500";
      default:
        return "bg-amber-400";
    }
  };

  const accentStyles: Record<string, { tint: string; chip: string; bar: string }> = {
    slate: { tint: "from-white to-slate-50", chip: "bg-slate-100 text-slate-600", bar: "from-slate-300 to-slate-400" },
    teal: { tint: "from-white to-teal-50/70", chip: "bg-teal-50 text-teal-700", bar: "from-teal-300 to-teal-500" },
    emerald: { tint: "from-white to-emerald-50/70", chip: "bg-emerald-50 text-emerald-700", bar: "from-emerald-300 to-emerald-500" },
    amber: { tint: "from-white to-amber-50/70", chip: "bg-amber-50 text-amber-700", bar: "from-amber-300 to-amber-500" },
    violet: { tint: "from-white to-violet-50/70", chip: "bg-violet-50 text-violet-700", bar: "from-violet-300 to-violet-500" },
  };

  const kpiCards: {
    label: string;
    value: string | number;
    accent: keyof typeof accentStyles;
    icon: React.ReactNode;
  }[] = [
    { label: "Eventos cargados", value: todosEventos.length, accent: "slate", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /> },
    { label: "Confirmados / en curso", value: eventosActivos, accent: "teal", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="m5 13 4 4L19 7" /> },
    { label: "Próximos eventos", value: proximos.length, accent: "emerald", icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 6v6l4 2" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></> },
    { label: "Borradores por cerrar", value: eventosBorrador, accent: "amber", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /> },
    { label: "Con actividad", value: eventosConActividad, accent: "violet", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M3 12h4l3 8 4-16 3 8h4" /> },
    { label: "Presupuesto total", value: fmtMoney(totalPresupuestado), accent: "emerald", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 3v18m5-14H9.5a2.5 2.5 0 0 0 0 5h5a2.5 2.5 0 0 1 0 5H6" /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <section className="rounded-3xl border border-neutral-200 bg-white shadow-sm mb-6">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">
                  Gestión operativa
                </p>
                <h1 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight text-neutral-900">
                  Eventos
                </h1>
                <p className="mt-3 max-w-2xl text-sm sm:text-base text-neutral-600">
                  Seguimiento comercial y operativo: estado, fechas, presupuesto, proveedores,
                  utileros e ingresos asociados.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/"
                  className="inline-flex items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
                >
                  Ver dashboard
                </Link>
                {isAdmin && (
                  <Link
                    href="/eventos/nuevo"
                    className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 transition-colors"
                  >
                    Nuevo evento
                  </Link>
                )}
              </div>
            </div>

          </div>
        </section>

        <section className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
          {kpiCards.map((card) => {
            const a = accentStyles[card.accent];
            return (
              <div
                key={card.label}
                className={`group relative overflow-hidden rounded-2xl border border-neutral-200 bg-gradient-to-br ${a.tint} p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-neutral-500 text-[11px] font-semibold uppercase tracking-wider leading-tight">
                    {card.label}
                  </p>
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${a.chip} transition-transform group-hover:scale-110`}>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {card.icon}
                    </svg>
                  </span>
                </div>
                <p className="mt-3 text-2xl font-semibold text-neutral-900 tabular-nums">{card.value}</p>
                <div className={`mt-3 h-1 w-full rounded-full bg-gradient-to-r ${a.bar} opacity-70 transition-opacity group-hover:opacity-100`} />
              </div>
            );
          })}
        </section>

        <div className="grid lg:grid-cols-[1fr_360px] gap-5 mb-6">
          <section className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <h2 className="text-sm font-semibold text-neutral-900">Buscar y filtrar</h2>
                <p className="text-xs text-neutral-500 mt-1">
                  {eventos.length} resultado{eventos.length === 1 ? "" : "s"} sobre {todosEventos.length} eventos
                </p>
              </div>
              {filtrosActivos && (
                <Link
                  href="/eventos"
                  className="text-xs font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
                >
                  Limpiar filtros
                </Link>
              )}
            </div>
            <form className="grid md:grid-cols-[1fr_190px_190px_auto] gap-3">
              <label className="group relative block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                  Búsqueda
                </span>
                <span className="pointer-events-none absolute left-3 top-[35px] text-neutral-400 transition-colors group-focus-within:text-neutral-800">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="m21 21-4.35-4.35m1.1-5.15a6.25 6.25 0 1 1-12.5 0 6.25 6.25 0 0 1 12.5 0Z" />
                  </svg>
                </span>
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="Evento, cliente, organizadora..."
                  className="h-11 w-full rounded-2xl border border-neutral-200 bg-gradient-to-b from-white to-neutral-50 pl-10 pr-4 text-sm text-neutral-900 shadow-[0_1px_0_rgba(15,23,42,0.03)] outline-none transition placeholder:text-neutral-400 hover:border-neutral-300 focus:border-neutral-900 focus:bg-white focus:ring-4 focus:ring-neutral-900/10"
                />
              </label>

              <label className="group relative block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                  Estado
                </span>
                <select
                  name="estado"
                  defaultValue={estadoFiltro}
                  className="peer h-11 w-full appearance-none rounded-2xl border border-neutral-200 bg-gradient-to-b from-white to-neutral-50 px-4 pr-10 text-sm font-medium text-neutral-800 shadow-[0_1px_0_rgba(15,23,42,0.03)] outline-none transition hover:border-neutral-300 focus:border-neutral-900 focus:bg-white focus:ring-4 focus:ring-neutral-900/10"
                >
                  <option value="">Todos los estados</option>
                  {Object.entries(estados).map(([estado, label]) => (
                    <option key={estado} value={estado}>
                      {label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-[34px] flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 transition peer-focus:bg-neutral-900 peer-focus:text-white">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m6 9 6 6 6-6" />
                  </svg>
                </span>
              </label>

              <label className="group relative block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                  Tipo
                </span>
                <select
                  name="tipo"
                  defaultValue={tipoFiltro}
                  className="peer h-11 w-full appearance-none rounded-2xl border border-neutral-200 bg-gradient-to-b from-white to-neutral-50 px-4 pr-10 text-sm font-medium text-neutral-800 shadow-[0_1px_0_rgba(15,23,42,0.03)] outline-none transition hover:border-neutral-300 focus:border-neutral-900 focus:bg-white focus:ring-4 focus:ring-neutral-900/10"
                >
                  <option value="">Todos los tipos</option>
                  {Object.entries(tipos).map(([tipo, label]) => (
                    <option key={tipo} value={tipo}>
                      {label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-[34px] flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 transition peer-focus:bg-neutral-900 peer-focus:text-white">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m6 9 6 6 6-6" />
                  </svg>
                </span>
              </label>

              <button
                type="submit"
                className="mt-[23px] inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-neutral-800 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-neutral-900/15"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 4.5h18M6.75 12h10.5M10 19.5h4" />
                </svg>
                Aplicar
              </button>
            </form>
          </section>

          <aside className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Próximo evento
            </p>
            {eventoMasCercano ? (
              <div className="mt-3">
                <p className="text-lg font-semibold text-neutral-950">{eventoMasCercano.nombre}</p>
                <p className="text-sm text-neutral-500 mt-1">{eventoMasCercano.cliente}</p>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-neutral-700">{fmtDate(eventoMasCercano.fecha)}</span>
                  <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
                    {diasHasta(eventoMasCercano.fecha)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-neutral-500">No hay eventos próximos cargados.</p>
            )}
          </aside>
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">Eventos cargados</h2>
              <p className="text-xs text-neutral-500 mt-1">
                Vista rápida de estado, fecha, presupuesto y movimientos asociados.
              </p>
            </div>
            <span className="text-xs text-neutral-400">Ordenados por fecha más reciente</span>
          </div>

          {eventos.length > 0 && (
            <div className="p-4 sm:p-5">
              <div className="grid gap-3 lg:grid-cols-2">
                {eventos.map((e) => {
                  const actividad = e._count.ingresos + e._count.pagosProveedores + e._count.diasUtileros;
                  const ubicacion = [e.localidad, e.provincia].filter(Boolean).join(", ");
                  return (
                    <div
                      key={e.id}
                      className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md"
                    >
                      <span className={`absolute inset-y-0 left-0 w-1 ${estadoBar(e.estado)}`} />
                      <div className="pl-2.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${e.tipo === "CORPORATIVO" ? "bg-sky-50 text-sky-700" : "bg-violet-50 text-violet-700"}`}>
                              {e.tipo === "CORPORATIVO" ? "CO" : "PA"}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-neutral-950">{e.nombre}</p>
                              <p className="mt-0.5 truncate text-xs text-neutral-500">
                                {tipos[e.tipo] ?? e.tipo}
                                {ubicacion && <> · {ubicacion}</>}
                              </p>
                            </div>
                          </div>
                          <span className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${estadoStyle(e.estado)}`}>
                            {estados[e.estado] ?? e.estado}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-2">
                          <div className="rounded-xl border border-neutral-100 bg-neutral-50/70 p-2.5">
                            <p className="text-[10px] uppercase tracking-wider text-neutral-400">Fecha</p>
                            <p className="mt-0.5 text-xs font-semibold tabular-nums text-neutral-800">{fmtDate(e.fecha)}</p>
                            <p className="text-[10px] text-neutral-400">{diasHasta(e.fecha)}</p>
                          </div>
                          <div className="rounded-xl border border-neutral-100 bg-neutral-50/70 p-2.5">
                            <p className="text-[10px] uppercase tracking-wider text-neutral-400">Cliente</p>
                            <p className="mt-0.5 truncate text-xs font-semibold text-neutral-800">{e.cliente}</p>
                            {e.organizadora && <p className="truncate text-[10px] text-neutral-400">Org. {e.organizadora}</p>}
                          </div>
                          <div className="rounded-xl border border-neutral-100 bg-neutral-50/70 p-2.5">
                            <p className="text-[10px] uppercase tracking-wider text-neutral-400">Presupuesto</p>
                            <p className="mt-0.5 text-xs font-semibold tabular-nums text-neutral-800">{fmtMoney(e.presupuestoTotal ?? 0)}</p>
                            {e.presupuestoNro && <p className="text-[10px] text-neutral-400">#{e.presupuestoNro}</p>}
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap gap-1.5">
                            <span className="rounded-full bg-neutral-100 px-2 py-1 text-[11px] font-medium text-neutral-600">{e._count.ingresos} ingresos</span>
                            <span className="rounded-full bg-neutral-100 px-2 py-1 text-[11px] font-medium text-neutral-600">{e._count.pagosProveedores} pagos</span>
                            <span className="rounded-full bg-neutral-100 px-2 py-1 text-[11px] font-medium text-neutral-600">{e._count.diasUtileros} utileros</span>
                            {actividad === 0 && (
                              <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-600">Sin movimientos</span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Link
                              href={`/eventos/${e.id}`}
                              className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 group-hover:border-neutral-300"
                            >
                              Ver
                            </Link>
                            {isAdmin && (
                              <Link
                                href={`/eventos/${e.id}/editar`}
                                className="rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-400 transition-colors hover:text-neutral-900"
                              >
                                Editar
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {eventos.length === 0 && (
            <div className="py-16 px-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">
                <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="mt-4 text-sm font-semibold text-neutral-900">
                {filtrosActivos ? "No hay eventos con esos filtros" : "Todavía no hay eventos cargados"}
              </h3>
              <p className="mt-1 text-sm text-neutral-500">
                {filtrosActivos
                  ? "Probá ajustar la búsqueda, estado o tipo para ampliar los resultados."
                  : "Creá el primer evento para empezar a registrar presupuesto, proveedores, utileros e ingresos."}
              </p>
              <div className="mt-5 flex justify-center gap-2">
                {filtrosActivos && (
                  <Link
                    href="/eventos"
                    className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                  >
                    Limpiar filtros
                  </Link>
                )}
                {isAdmin && (
                  <Link
                    href="/eventos/nuevo"
                    className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 transition-colors"
                  >
                    Nuevo evento
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
