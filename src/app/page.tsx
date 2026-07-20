import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { HomeOperativoPanel } from "@/components/dashboard/home-operativo-panel";
import { sumMovimientosProveedorGlobalRaw, topProveedoresMovimientosRaw } from "@/lib/pago-proveedor-raw";
import { fetchHomeOperativoInsights } from "@/lib/home-operativo-insights";
import { CAJA_SENTIDO_EGRESO } from "@/lib/caja-chica-pesos";
import { resolvePermisos } from "@/lib/permisos";

function homeDbFailureMessage(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return `[${error.code}] ${error.message}`;
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return String(error);
}

function homeDbFailureHint(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();
  if (
    lower.includes("p1001") ||
    lower.includes("can't reach database") ||
    lower.includes("connection refused") ||
    lower.includes("econnrefused") ||
    lower.includes("getaddrinfo") ||
    lower.includes("timeout")
  ) {
    return "No hay conexión al servidor PostgreSQL. Verificá DATABASE_URL en .env (Neon: host, usuario, sslmode) y que la base esté activa.";
  }
  if (
    lower.includes("does not exist") ||
    lower.includes("column ") ||
    lower.includes("unknown field") ||
    lower.includes("p2022")
  ) {
    return "El cliente Prisma no coincide con la BD. En Neon ejecutá prisma/eventos-sync-schema.sql (alinea todas las columnas). Si la base es nueva, antes prisma/eventos-tables.sql.";
  }
  return "Mirá el mensaje técnico abajo y la terminal donde corre next dev (npm run dev).";
}

type EventoReciente = Prisma.EventoGetPayload<{
  include: { _count: { select: { pagosProveedores: true; ingresos: true } } };
}>;

export default async function HomePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isAdmin = session.user.role === "ADMIN";
  const tipos: Record<string, string> = {
    CORPORATIVO: "Corporativo",
    PARTICULAR: "Particular",
  };

  let eventosCount = 0;
  let eventosMes = 0;
  let eventosRecientes: EventoReciente[] = [];
  let ingresos = 0;
  let pagos = 0;
  let utileros = 0;
  let cajaChica = 0;
  let egresos = 0;
  let balance = 0;
  let proveedoresConNombre: { nombre: string; monto: number; rubro: string }[] = [];
  let tablesReady = false;
  let homeLoadError: string | null = null;

  try {
    await prisma.$connect();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [
      count,
      mes,
      recientes,
      totalIngresos,
      totalPagosAgg,
      totalUtileros,
      pagosMovRaw,
      topProvRaw,
    ] = await Promise.all([
      prisma.evento.count(),
      prisma.evento.count({
        where: { fecha: { gte: startOfMonth, lte: endOfMonth } },
      }),
      prisma.evento.findMany({
        take: 6,
        orderBy: { fecha: "desc" },
        include: { _count: { select: { pagosProveedores: true, ingresos: true } } },
      }),
      prisma.ingreso.aggregate({ _sum: { monto: true } }),
      prisma.pagoProveedor.aggregate({ _sum: { monto: true } }),
      prisma.diaUtilero.aggregate({ _sum: { monto: true } }),
      sumMovimientosProveedorGlobalRaw(),
      topProveedoresMovimientosRaw(5),
    ]);

    let cajaChicaSum = 0;
    try {
      const totalCajaChica = await prisma.cajaChicaEvento.aggregate({
        where: { sentido: CAJA_SENTIDO_EGRESO },
        _sum: { monto: true },
      });
      cajaChicaSum = totalCajaChica._sum?.monto ?? 0;
    } catch {
      try {
        const fallback = await prisma.cajaChicaEvento.aggregate({ _sum: { monto: true } });
        cajaChicaSum = fallback._sum?.monto ?? 0;
      } catch {
        cajaChicaSum = 0;
      }
    }

    eventosCount = count;
    eventosMes = mes;
    eventosRecientes = recientes;
    ingresos = totalIngresos._sum.monto ?? 0;
    pagos = pagosMovRaw !== null ? pagosMovRaw : (totalPagosAgg._sum.monto ?? 0);
    utileros = totalUtileros._sum.monto ?? 0;
    cajaChica = cajaChicaSum;
    egresos = pagos + utileros + cajaChica;
    balance = ingresos - egresos;
    tablesReady = true;

    const topProveedores =
      topProvRaw.length > 0
        ? topProvRaw
        : await prisma.pagoProveedor
            .groupBy({
              by: ["proveedorId"],
              _sum: { monto: true },
              orderBy: { _sum: { monto: "desc" } },
              take: 5,
            })
            .then((rows) =>
              rows.map((p) => ({ proveedorId: p.proveedorId, total: p._sum.monto ?? 0 }))
            );

    proveedoresConNombre = await Promise.all(
      topProveedores.map(async (p) => {
        const prov = await prisma.proveedorEvento.findUnique({
          where: { id: p.proveedorId },
          include: { rubro: true },
        });
        return {
          nombre: prov?.nombre ?? "-",
          monto: p.total,
          rubro: prov?.rubro?.nombre ?? "-",
        };
      })
    );
  } catch (e) {
    homeLoadError = homeDbFailureMessage(e);
    console.error("[HomePage] Error al cargar datos desde la BD:", e);
  }

  const insightsOperativo =
    tablesReady && !isAdmin ? await fetchHomeOperativoInsights() : null;

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buenos días";
    if (hour < 19) return "Buenas tardes";
    return "Buenas noches";
  };

  const fmtMoney = (v: number) => `$${v.toLocaleString("es-AR")}`;
  const fmtDate = (d: Date) =>
    new Date(d).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
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
  const proveedorMax = Math.max(...proveedoresConNombre.map((p) => p.monto), 1);

  return (
    <div className="min-h-screen bg-[#f8f8f8]">
      <Navbar />
      {!tablesReady && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-4 text-sm text-amber-950 max-w-6xl mx-auto">
          <p className="font-medium text-amber-900">No se pudieron cargar los datos del inicio desde la base de datos.</p>
          <p className="mt-2 text-amber-900/90">{homeDbFailureHint(homeLoadError ?? new Error(""))}</p>
          {homeLoadError && (
            <pre className="mt-3 text-left text-xs bg-amber-100/80 border border-amber-200 rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-words text-amber-950">
              {homeLoadError}
            </pre>
          )}
        </div>
      )}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isAdmin ? (
          <section className="rounded-3xl border border-neutral-200 bg-white shadow-sm mb-6">
            <div className="p-6 sm:p-7">
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">
                    Panel administrativo
                  </p>
                  <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-900">
                    {greeting()}, {session.user?.name?.split(" ")[0] ?? "Usuario"}
                  </h1>
                  <p className="text-neutral-600 text-sm mt-2 max-w-2xl">
                    Un resumen rápido del flujo operativo: eventos, cobros, pagos y prioridades del sistema.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/eventos"
                    className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Ver eventos
                  </Link>
                  <Link
                    href="/eventos/nuevo"
                    className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 4v16m8-8H4" />
                    </svg>
                    Nuevo evento
                  </Link>
                  <Link
                    href="/reportes"
                    className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M9 17v-6m4 6V7m4 10v-4M5 21h14" />
                    </svg>
                    Reportes
                  </Link>
                </div>
              </div>
              <div className="mt-7 grid sm:grid-cols-3 gap-3">
                <div className="rounded-2xl border border-neutral-300 bg-neutral-200 p-4 shadow-inner">
                  <p className="text-xs font-medium text-neutral-700">Resultado actual</p>
                  <p
                    className={`mt-2 text-2xl font-semibold tabular-nums ${
                      balance >= 0 ? "text-emerald-900" : "text-rose-800"
                    }`}
                  >
                    {balance >= 0 ? "+" : ""}
                    {fmtMoney(balance)}
                  </p>
                </div>
                <div className="rounded-2xl border border-neutral-300 bg-neutral-200 p-4 shadow-inner">
                  <p className="text-xs font-medium text-neutral-700">Eventos este mes</p>
                  <p className="mt-2 text-2xl font-semibold tabular-nums text-neutral-950">{eventosMes}</p>
                </div>
                <div className="rounded-2xl border border-neutral-300 bg-neutral-200 p-4 shadow-inner">
                  <p className="text-xs font-medium text-neutral-700">Últimos registros</p>
                  <p className="mt-2 text-2xl font-semibold tabular-nums text-neutral-950">{eventosRecientes.length}</p>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <h1 className="sr-only">Inicio — panel operativo</h1>
        )}

        {insightsOperativo && !isAdmin && (
          <HomeOperativoPanel
            firstName={session.user.name?.split(" ")[0] ?? "Usuario"}
            insights={insightsOperativo}
            permisos={session.user.permisos ?? resolvePermisos(session.user.role, null)}
          />
        )}

        {!isAdmin && (
        <div className="flex flex-wrap gap-2 mb-8 mt-2">
          <Link
            href="/eventos"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-teal-800 hover:bg-teal-900 text-white shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Ver eventos
          </Link>
        </div>
        )}

        {isAdmin && (
          <>
            <section className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-8">
              <div className="group bg-white rounded-2xl p-4 border border-neutral-200 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-neutral-400 text-[11px] font-semibold uppercase tracking-wider">
                    Total eventos
                  </p>
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500 group-hover:bg-neutral-900 group-hover:text-white transition-colors">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </span>
                </div>
                <p className="mt-3 text-2xl font-semibold text-neutral-900 tabular-nums">{eventosCount}</p>
                <p className="text-[11px] text-neutral-400 mt-1">Base completa</p>
              </div>
              <div className="group bg-white rounded-2xl p-4 border border-neutral-200 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-neutral-400 text-[11px] font-semibold uppercase tracking-wider">
                    Este mes
                  </p>
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 6v6l4 2" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                  </span>
                </div>
                <p className="mt-3 text-2xl font-semibold text-neutral-900 tabular-nums">{eventosMes}</p>
                <p className="text-[11px] text-neutral-400 mt-1">Calendario actual</p>
              </div>
              <div className="group bg-white rounded-2xl p-4 border border-neutral-200 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-neutral-400 text-[11px] font-semibold uppercase tracking-wider">
                    Ingresos
                  </p>
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="m7 11 5-5 5 5M12 6v12" />
                    </svg>
                  </span>
                </div>
                <p className="mt-3 text-2xl font-semibold text-neutral-900 tabular-nums">
                  {fmtMoney(ingresos)}
                </p>
                <p className="text-[11px] text-neutral-400 mt-1">Cobros registrados</p>
              </div>
              <div className="group bg-white rounded-2xl p-4 border border-neutral-200 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-neutral-400 text-[11px] font-semibold uppercase tracking-wider">
                    Egresos
                  </p>
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50 text-orange-700">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="m7 13 5 5 5-5M12 6v12" />
                    </svg>
                  </span>
                </div>
                <p className="mt-3 text-2xl font-semibold text-neutral-900 tabular-nums">
                  {fmtMoney(egresos)}
                </p>
                <p className="text-[11px] text-neutral-400 mt-1">Pagos y gastos</p>
              </div>
              <div className="group bg-white rounded-2xl p-4 border border-neutral-200 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-neutral-400 text-[11px] font-semibold uppercase tracking-wider">
                    Caja chica
                  </p>
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M21 12H3m18 0v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6m18 0-2.5-6h-13L3 12" />
                    </svg>
                  </span>
                </div>
                <p className="mt-3 text-2xl font-semibold text-neutral-900 tabular-nums">
                  {fmtMoney(cajaChica)}
                </p>
                <p className="text-[11px] text-neutral-400 mt-1">Egresos menores</p>
              </div>
              <div className={`rounded-2xl p-4 border shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all ${balance >= 0 ? "bg-emerald-50/60 border-emerald-100" : "bg-rose-50/60 border-rose-100"}`}>
                <div className="flex items-start justify-between gap-3">
                  <p className={`text-[11px] font-semibold uppercase tracking-wider ${balance >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                    Balance
                  </p>
                  <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${balance >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M4 19V5m0 14h16M8 15l3-3 3 2 5-7" />
                    </svg>
                  </span>
                </div>
                <p className="mt-3 text-2xl font-semibold text-neutral-900 tabular-nums">
                  {balance >= 0 ? "+" : ""}{fmtMoney(balance)}
                </p>
                <p className={`text-[11px] mt-1 ${balance >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                  Ingresos menos egresos
                </p>
              </div>
            </section>

            <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6 mb-8">
              <section className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-neutral-900">Ingresos vs Egresos</h2>
                    <p className="text-neutral-400 text-xs mt-0.5">Distribución por categoría</p>
                  </div>
                  <span className="rounded-full bg-neutral-100 px-3 py-1 text-[11px] font-medium text-neutral-500">
                    Finanzas
                  </span>
                </div>
                <div className="p-5">
                  <DashboardCharts
                    ingresos={ingresos}
                    pagos={pagos}
                    utileros={utileros}
                    cajaChica={cajaChica}
                  />
                </div>
              </section>
              <section className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-neutral-100 flex justify-between items-center">
                  <div>
                    <h2 className="text-sm font-semibold text-neutral-900">Top proveedores</h2>
                    <p className="text-neutral-400 text-xs mt-0.5">Por monto facturado</p>
                  </div>
                  <Link
                    href="/reportes"
                    className="text-xs font-medium text-neutral-400 hover:text-neutral-700 transition-colors"
                  >
                    Ver reportes →
                  </Link>
                </div>
                <div className="p-5">
                  {proveedoresConNombre.length === 0 ? (
                    <div className="py-12 text-center rounded-2xl bg-neutral-50 border border-neutral-100">
                      <p className="text-neutral-400 text-sm">Sin datos de proveedores</p>
                      <Link href="/proveedores" className="text-neutral-600 hover:text-neutral-900 text-sm mt-1 inline-block font-medium">
                        Gestionar proveedores
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {proveedoresConNombre.map((p, i) => (
                        <div
                          key={`${p.nombre}-${i}`}
                          className="rounded-2xl border border-neutral-100 bg-neutral-50/60 p-3 hover:bg-neutral-50 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="w-7 h-7 rounded-xl bg-white border border-neutral-200 flex items-center justify-center text-[11px] font-semibold text-neutral-500 shrink-0">
                                {i + 1}
                              </span>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-neutral-900 truncate">{p.nombre}</p>
                                <p className="text-[11px] text-neutral-400">{p.rubro}</p>
                              </div>
                            </div>
                            <span className="text-sm font-semibold text-neutral-800 tabular-nums shrink-0">
                              {fmtMoney(p.monto)}
                            </span>
                          </div>
                          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-200">
                            <div
                              className="h-full rounded-full bg-neutral-900"
                              style={{ width: `${Math.max((p.monto / proveedorMax) * 100, 6)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>
          </>
        )}

        <section className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-neutral-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">Eventos recientes</h2>
              <p className="text-neutral-400 text-xs mt-0.5">Últimos registros con actividad rápida</p>
            </div>
            <Link
              href="/eventos"
              className="inline-flex items-center justify-center rounded-xl border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
            >
              Ver todos →
            </Link>
          </div>
          <div className="p-5">
            {eventosRecientes.length > 0 && (
              <div className="grid md:grid-cols-2 gap-3">
                {eventosRecientes.map((e) => {
                  const actividad = e._count.ingresos + e._count.pagosProveedores;
                  return (
                    <Link
                      key={e.id}
                      href={`/eventos/${e.id}`}
                      className="group rounded-2xl border border-neutral-100 bg-neutral-50/60 p-4 hover:border-neutral-200 hover:bg-white hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-teal-500" />
                            <p className="text-sm font-semibold text-neutral-950 truncate">{e.nombre}</p>
                          </div>
                          <p className="text-xs text-neutral-500 mt-1 truncate">{e.cliente}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-white border border-neutral-200 px-2.5 py-1 text-[11px] font-medium text-neutral-600">
                          {tipos[e.tipo] ?? e.tipo}
                        </span>
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <div className="rounded-xl bg-white border border-neutral-100 p-3">
                          <p className="text-[10px] uppercase tracking-wider text-neutral-400">Fecha</p>
                          <p className="text-xs font-semibold text-neutral-800 mt-1">{fmtDate(e.fecha)}</p>
                        </div>
                        <div className="rounded-xl bg-white border border-neutral-100 p-3">
                          <p className="text-[10px] uppercase tracking-wider text-neutral-400">Estado</p>
                          <p className="text-xs font-semibold text-neutral-800 mt-1">{e.estado.replaceAll("_", " ")}</p>
                        </div>
                        <div className="rounded-xl bg-white border border-neutral-100 p-3">
                          <p className="text-[10px] uppercase tracking-wider text-neutral-400">Actividad</p>
                          <p className="text-xs font-semibold text-neutral-800 mt-1">{actividad} mov.</p>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-xs text-neutral-400">{diasHasta(e.fecha)}</span>
                        <span className="text-xs font-semibold text-neutral-500 group-hover:text-neutral-950 transition-colors">
                          Abrir →
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
            {eventosRecientes.length === 0 && (
              <div className="py-16 text-center rounded-2xl bg-neutral-50 border border-neutral-100">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-neutral-200 text-neutral-400">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-neutral-600 text-sm font-medium mt-4">No hay eventos</p>
                <p className="text-neutral-400 text-xs mt-1">
                  {isAdmin ? (
                    <>
                      <Link href="/eventos/nuevo" className="text-neutral-700 hover:text-neutral-900 font-medium">
                        Crear el primer evento
                      </Link>{" "}
                      para comenzar
                    </>
                  ) : (
                    "Aún no se han cargado eventos"
                  )}
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
