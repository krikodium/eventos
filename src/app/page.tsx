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

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [
    eventosCount,
    eventosMes,
    eventosRecientes,
    totalIngresos,
    totalPagos,
    totalUtileros,
    totalCajaChica,
  ] = await Promise.all([
    prisma.evento.count(),
    prisma.evento.count({
      where: {
        fecha: { gte: startOfMonth, lte: endOfMonth },
      },
    }),
    prisma.evento.findMany({
      take: 6,
      orderBy: { fecha: "desc" },
      include: {
        _count: { select: { pagosProveedores: true, ingresos: true } },
      },
    }),
    prisma.ingreso.aggregate({ _sum: { monto: true } }),
    prisma.pagoProveedor.aggregate({ _sum: { monto: true } }),
    prisma.diaUtilero.aggregate({ _sum: { monto: true } }),
    prisma.cajaChicaEvento.aggregate({ _sum: { monto: true } }),
  ]);

  const ingresos = totalIngresos._sum.monto ?? 0;
  const pagos = totalPagos._sum.monto ?? 0;
  const utileros = totalUtileros._sum.monto ?? 0;
  const cajaChica = totalCajaChica._sum.monto ?? 0;
  const egresos = pagos + utileros + cajaChica;
  const balance = ingresos - egresos;

  const topProveedores = await prisma.pagoProveedor.groupBy({
    by: ["proveedorId"],
    _sum: { monto: true },
    orderBy: { _sum: { monto: "desc" } },
    take: 5,
  });

  const proveedoresConNombre = await Promise.all(
    topProveedores.map(async (p) => {
      const prov = await prisma.proveedorEvento.findUnique({
        where: { id: p.proveedorId },
        include: { rubro: true },
      });
      return { nombre: prov?.nombre ?? "-", monto: p._sum.monto ?? 0, rubro: prov?.rubro?.nombre ?? "-" };
    })
  );

  const tipos: Record<string, string> = {
    CORPORATIVO: "Corporativo",
    PARTICULAR: "Particular",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
            {isAdmin ? "Panel de control" : "Mis eventos"}
          </h1>
          <div className="flex gap-3">
            <Link
              href="/eventos"
              className="px-4 py-2 text-sm font-medium text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors"
            >
              Ver todos los eventos
            </Link>
            {isAdmin && (
              <Link
                href="/eventos/nuevo"
                className="px-4 py-2 text-sm font-medium bg-sky-600 hover:bg-sky-700 text-white rounded-lg shadow-sm transition-colors"
              >
                Nuevo evento
              </Link>
            )}
          </div>
        </div>

        {isAdmin ? (
          <>
            <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Total eventos
                </p>
                <p className="text-2xl font-semibold text-gray-900">{eventosCount}</p>
              </div>
              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Este mes
                </p>
                <p className="text-2xl font-semibold text-gray-900">{eventosMes}</p>
              </div>
              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Ingresos
                </p>
                <p className="text-2xl font-semibold text-sky-600">
                  ${ingresos.toLocaleString("es-AR")}
                </p>
              </div>
              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Egresos
                </p>
                <p className="text-2xl font-semibold text-rose-600">
                  ${egresos.toLocaleString("es-AR")}
                </p>
              </div>
              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Caja chica
                </p>
                <p className="text-2xl font-semibold text-gray-700">
                  ${cajaChica.toLocaleString("es-AR")}
                </p>
              </div>
              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Balance
                </p>
                <p
                  className={`text-2xl font-semibold ${
                    balance >= 0 ? "text-sky-600" : "text-rose-600"
                  }`}
                >
                  ${balance.toLocaleString("es-AR")}
                </p>
              </div>
            </section>

            <div className="grid lg:grid-cols-2 gap-8 mb-8">
              <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Ingresos vs Egresos
                </h2>
                <DashboardCharts
                  ingresos={ingresos}
                  pagos={pagos}
                  utileros={utileros}
                  cajaChica={cajaChica}
                />
              </section>
              <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Top 5 proveedores
                </h2>
                <div className="space-y-3">
                  {proveedoresConNombre.length === 0 ? (
                    <p className="text-gray-500 text-sm">Sin datos</p>
                  ) : (
                    proveedoresConNombre.map((p) => (
                      <div
                        key={p.nombre}
                        className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{p.nombre}</p>
                          <p className="text-xs text-gray-500">{p.rubro}</p>
                        </div>
                        <span className="font-semibold text-gray-900">
                          ${p.monto.toLocaleString("es-AR")}
                        </span>
                      </div>
                    ))
                  )}
                </div>
                <Link
                  href="/reportes"
                  className="mt-4 inline-block text-sm font-medium text-sky-600 hover:text-sky-700"
                >
                  Ver reportes completos →
                </Link>
              </section>
            </div>
          </>
        ) : null}

        <section className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Próximos eventos</h2>
            <Link
              href="/eventos"
              className="text-sm font-medium text-sky-600 hover:text-sky-700"
            >
              Ver todos
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                  <th className="py-3 px-6">Evento</th>
                  <th className="py-3 px-6">Cliente</th>
                  <th className="py-3 px-6">Fecha</th>
                  <th className="py-3 px-6">Tipo</th>
                  <th className="py-3 px-6"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {eventosRecientes.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <span className="font-medium text-gray-900">{e.nombre}</span>
                    </td>
                    <td className="py-4 px-6 text-gray-600">{e.cliente}</td>
                    <td className="py-4 px-6 text-gray-600">
                      {new Date(e.fecha).toLocaleDateString("es-AR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
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
              <p className="py-12 text-center text-gray-500">
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
