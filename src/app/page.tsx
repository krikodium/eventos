import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";

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
  let eventosRecientes: Awaited<ReturnType<typeof prisma.evento.findMany>> = [];
  let ingresos = 0;
  let pagos = 0;
  let utileros = 0;
  let cajaChica = 0;
  let egresos = 0;
  let balance = 0;
  let proveedoresConNombre: { nombre: string; monto: number; rubro: string }[] = [];
  let tablesReady = false;

  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [
      count,
      mes,
      recientes,
      totalIngresos,
      totalPagos,
      totalUtileros,
      totalCajaChica,
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
      prisma.cajaChicaEvento.aggregate({ _sum: { monto: true } }),
    ]);

    eventosCount = count;
    eventosMes = mes;
    eventosRecientes = recientes;
    ingresos = totalIngresos._sum.monto ?? 0;
    pagos = totalPagos._sum.monto ?? 0;
    utileros = totalUtileros._sum.monto ?? 0;
    cajaChica = totalCajaChica._sum.monto ?? 0;
    egresos = pagos + utileros + cajaChica;
    balance = ingresos - egresos;
    tablesReady = true;

    const topProveedores = await prisma.pagoProveedor.groupBy({
      by: ["proveedorId"],
      _sum: { monto: true },
      orderBy: { _sum: { monto: "desc" } },
      take: 5,
    });

    proveedoresConNombre = await Promise.all(
      topProveedores.map(async (p) => {
        const prov = await prisma.proveedorEvento.findUnique({
          where: { id: p.proveedorId },
          include: { rubro: true },
        });
        return {
          nombre: prov?.nombre ?? "-",
          monto: p._sum.monto ?? 0,
          rubro: prov?.rubro?.nombre ?? "-",
        };
      })
    );
  } catch {
    // Tablas de Eventos no existen aún - mostrar dashboard vacío
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      {!tablesReady && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-center text-sm text-amber-800">
          Las tablas de Eventos no están creadas. Ejecuta{" "}
          <code className="bg-amber-100 px-1 rounded">prisma/eventos-tables.sql</code>{" "}
          en el SQL Editor de Neon para activar el sistema.
        </div>
      )}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {isAdmin ? "Panel de control" : "Mis eventos"}
          </h1>
          <div className="flex gap-3">
            <Link
              href="/eventos"
              className="px-4 py-2.5 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            >
              Ver todos los eventos
            </Link>
            {isAdmin && (
              <Link
                href="/eventos/nuevo"
                className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-200 font-medium text-sm shadow-sm hover:shadow transition-all"
              >
                Nuevo evento
              </Link>
            )}
          </div>
        </div>

        {isAdmin ? (
          <>
            <section className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4 mb-8">
              <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
                  Total eventos
                </p>
                <p className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums">{eventosCount}</p>
              </div>
              <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
                  Este mes
                </p>
                <p className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums">{eventosMes}</p>
              </div>
              <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
                  Ingresos
                </p>
                <p className="text-xl sm:text-2xl font-bold text-emerald-600 tabular-nums">
                  ${ingresos.toLocaleString("es-AR")}
                </p>
              </div>
              <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
                  Egresos
                </p>
                <p className="text-xl sm:text-2xl font-bold text-rose-600 tabular-nums">
                  ${egresos.toLocaleString("es-AR")}
                </p>
              </div>
              <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
                  Caja chica
                </p>
                <p className="text-xl sm:text-2xl font-bold text-slate-700 tabular-nums">
                  ${cajaChica.toLocaleString("es-AR")}
                </p>
              </div>
              <div
                className={`bg-white rounded-xl p-4 sm:p-5 border shadow-sm hover:shadow-md transition-shadow col-span-2 lg:col-span-1 ${
                  balance >= 0 ? "border-emerald-200/60" : "border-rose-200/60"
                }`}
              >
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
                  Balance
                </p>
                <p
                  className={`text-xl sm:text-2xl font-bold tabular-nums ${
                    balance >= 0 ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  ${balance.toLocaleString("es-AR")}
                </p>
              </div>
            </section>

            <div className="grid lg:grid-cols-2 gap-8 mb-8">
              <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-700 bg-slate-800">
                  <h2 className="font-semibold text-white text-sm uppercase tracking-wider">
                    Ingresos vs Egresos
                  </h2>
                </div>
                <div className="p-6">
                <DashboardCharts
                  ingresos={ingresos}
                  pagos={pagos}
                  utileros={utileros}
                  cajaChica={cajaChica}
                />
                </div>
              </section>
              <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-700 bg-slate-800 flex justify-between items-center">
                  <div>
                    <h2 className="font-semibold text-white text-sm uppercase tracking-wider">
                      Top 5 proveedores
                    </h2>
                  </div>
                  <Link
                    href="/reportes"
                    className="text-xs font-medium text-slate-300 hover:text-white transition-colors"
                  >
                    Ver reportes →
                  </Link>
                </div>
                <div className="p-6 space-y-3">
                  {proveedoresConNombre.length === 0 ? (
                    <p className="text-slate-500 text-sm">Sin datos</p>
                  ) : (
                    proveedoresConNombre.map((p, i) => (
                      <div
                        key={`${p.nombre}-${i}`}
                        className="flex justify-between items-center py-2 px-3 rounded-lg bg-slate-50 hover:bg-slate-100/80 transition-colors"
                      >
                        <div>
                          <p className="font-medium text-slate-900">{p.nombre}</p>
                          <p className="text-xs text-slate-500">{p.rubro}</p>
                        </div>
                        <span className="font-semibold text-slate-900 tabular-nums">
                          ${p.monto.toLocaleString("es-AR")}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </>
        ) : null}

        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700 bg-slate-800 flex justify-between items-center">
            <h2 className="font-semibold text-white text-sm uppercase tracking-wider">
              Próximos eventos
            </h2>
            <Link
              href="/eventos"
              className="text-xs font-medium text-slate-300 hover:text-white transition-colors"
            >
              Ver todos
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-semibold text-slate-900 uppercase tracking-wider bg-slate-50">
                  <th className="py-3 px-6">Evento</th>
                  <th className="py-3 px-6">Cliente</th>
                  <th className="py-3 px-6">Fecha</th>
                  <th className="py-3 px-6">Tipo</th>
                  <th className="py-3 px-6"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {eventosRecientes.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <span className="font-medium text-slate-900">{e.nombre}</span>
                    </td>
                    <td className="py-4 px-6 text-slate-600">{e.cliente}</td>
                    <td className="py-4 px-6 text-slate-600">
                      {new Date(e.fecha).toLocaleDateString("es-AR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex px-2.5 py-1 rounded-md text-xs font-medium bg-slate-200 text-slate-700">
                        {tipos[e.tipo] ?? e.tipo}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <Link
                        href={`/eventos/${e.id}`}
                        className="text-sm font-medium text-sky-600 hover:text-sky-700"
                      >
                        Ver detalle →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {eventosRecientes.length === 0 && (
              <p className="py-12 text-center text-slate-500">
                No hay eventos.{" "}
                {isAdmin && (
                  <Link href="/eventos/nuevo" className="text-sky-600 hover:text-sky-700">
                    Crear uno
                  </Link>
                )}
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
