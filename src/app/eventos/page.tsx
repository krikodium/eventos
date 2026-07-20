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
  const eventosFacturados = todosEventos.filter((e) => e.estado === "FACTURADO").length;
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

  return (
    <div className="min-h-screen bg-[#f8f8f8]">
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

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-8">
              <div className="rounded-2xl border border-neutral-300 bg-neutral-200 p-4 shadow-inner">
                <p className="text-xs font-medium text-neutral-700">Eventos cargados</p>
                <p className="mt-2 text-3xl font-semibold tabular-nums text-neutral-950">{todosEventos.length}</p>
              </div>
              <div className="rounded-2xl border border-neutral-300 bg-neutral-200 p-4 shadow-inner">
                <p className="text-xs font-medium text-neutral-700">Confirmados / en curso</p>
                <p className="mt-2 text-3xl font-semibold tabular-nums text-neutral-950">{eventosActivos}</p>
              </div>
              <div className="rounded-2xl border border-neutral-300 bg-neutral-200 p-4 shadow-inner">
                <p className="text-xs font-medium text-neutral-700">Próximos eventos</p>
                <p className="mt-2 text-3xl font-semibold tabular-nums text-neutral-950">{proximos.length}</p>
              </div>
              <div className="rounded-2xl border border-neutral-300 bg-neutral-200 p-4 shadow-inner">
                <p className="text-xs font-medium text-neutral-700">Presupuesto total</p>
                <p className="mt-2 text-3xl font-semibold tabular-nums text-neutral-950">
                  {fmtMoney(totalPresupuestado)}
                </p>
              </div>
            </div>
          </div>
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

        <section className="grid sm:grid-cols-3 gap-3 mb-6">
          <div className="rounded-2xl border border-neutral-300 bg-neutral-200 p-4 shadow-inner">
            <p className="text-xs font-medium text-neutral-700">Borradores por cerrar</p>
            <p className="mt-1 text-2xl font-semibold text-neutral-950 tabular-nums">{eventosBorrador}</p>
          </div>
          <div className="rounded-2xl border border-neutral-300 bg-neutral-200 p-4 shadow-inner">
            <p className="text-xs font-medium text-neutral-700">Facturados</p>
            <p className="mt-1 text-2xl font-semibold text-neutral-950 tabular-nums">{eventosFacturados}</p>
          </div>
          <div className="rounded-2xl border border-neutral-300 bg-neutral-200 p-4 shadow-inner">
            <p className="text-xs font-medium text-neutral-700">Con actividad registrada</p>
            <p className="mt-1 text-2xl font-semibold text-neutral-950 tabular-nums">{eventosConActividad}</p>
          </div>
        </section>

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

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-[11px] font-semibold text-neutral-400 uppercase tracking-wider border-b border-neutral-100 bg-neutral-50/70">
                  <th className="py-3 px-5">Evento</th>
                  <th className="py-3 px-5">Fecha</th>
                  <th className="py-3 px-5">Cliente</th>
                  <th className="py-3 px-5">Presupuesto</th>
                  <th className="py-3 px-5">Actividad</th>
                  <th className="py-3 px-5">Estado</th>
                  <th className="py-3 px-5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {eventos.map((e) => {
                  const actividad = e._count.ingresos + e._count.pagosProveedores + e._count.diasUtileros;
                  return (
                    <tr key={e.id} className="hover:bg-neutral-50/80 transition-colors">
                      <td className="py-4 px-5">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-sm font-semibold text-neutral-700">
                            {e.tipo === "CORPORATIVO" ? "CO" : "PA"}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-neutral-950">{e.nombre}</p>
                            <p className="text-xs text-neutral-500 mt-1">
                              {tipos[e.tipo] ?? e.tipo}
                              {(e.localidad || e.provincia) && (
                                <> · {[e.localidad, e.provincia].filter(Boolean).join(", ")}</>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <p className="text-sm font-medium text-neutral-800 tabular-nums">{fmtDate(e.fecha)}</p>
                        <p className="text-xs text-neutral-400 mt-1">{diasHasta(e.fecha)}</p>
                      </td>
                      <td className="py-4 px-5">
                        <p className="text-sm text-neutral-700">{e.cliente}</p>
                        {e.organizadora && (
                          <p className="text-xs text-neutral-400 mt-1">Org. {e.organizadora}</p>
                        )}
                      </td>
                      <td className="py-4 px-5">
                        <p className="text-sm font-semibold text-neutral-900 tabular-nums">
                          {fmtMoney(e.presupuestoTotal ?? 0)}
                        </p>
                        {e.presupuestoNro && <p className="text-xs text-neutral-400 mt-1">#{e.presupuestoNro}</p>}
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex flex-wrap gap-1.5">
                          <span className="rounded-full bg-neutral-100 px-2 py-1 text-[11px] font-medium text-neutral-600">
                            {e._count.ingresos} ingresos
                          </span>
                          <span className="rounded-full bg-neutral-100 px-2 py-1 text-[11px] font-medium text-neutral-600">
                            {e._count.pagosProveedores} pagos
                          </span>
                          <span className="rounded-full bg-neutral-100 px-2 py-1 text-[11px] font-medium text-neutral-600">
                            {e._count.diasUtileros} utileros
                          </span>
                        </div>
                        {actividad === 0 && (
                          <p className="text-[11px] text-amber-600 mt-2">Sin movimientos cargados</p>
                        )}
                      </td>
                      <td className="py-4 px-5">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${estadoStyle(e.estado)}`}>
                          {estados[e.estado] ?? e.estado}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/eventos/${e.id}`}
                            className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
                          >
                            Ver
                          </Link>
                          {isAdmin && (
                            <Link
                              href={`/eventos/${e.id}/editar`}
                              className="rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-neutral-900 transition-colors"
                            >
                              Editar
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y divide-neutral-100">
            {eventos.map((e) => (
              <article key={e.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{e.nombre}</p>
                    <p className="text-xs text-neutral-500 mt-1">{e.cliente}</p>
                  </div>
                  <span className={`shrink-0 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${estadoStyle(e.estado)}`}>
                    {estados[e.estado] ?? e.estado}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl bg-neutral-50 p-3">
                    <p className="text-neutral-400">Fecha</p>
                    <p className="mt-1 font-medium text-neutral-800">{fmtDate(e.fecha)}</p>
                  </div>
                  <div className="rounded-xl bg-neutral-50 p-3">
                    <p className="text-neutral-400">Presupuesto</p>
                    <p className="mt-1 font-medium text-neutral-800">{fmtMoney(e.presupuestoTotal ?? 0)}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-xs text-neutral-500">
                    {e._count.ingresos} ingresos · {e._count.pagosProveedores} pagos · {e._count.diasUtileros} utileros
                  </p>
                  <Link href={`/eventos/${e.id}`} className="text-xs font-semibold text-neutral-900">
                    Ver →
                  </Link>
                </div>
              </article>
            ))}
          </div>

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
