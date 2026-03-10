import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function EventosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isAdmin = session.user.role === "ADMIN";
  const eventos = await prisma.evento.findMany({
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

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Eventos</h1>
          {isAdmin && (
            <Link
              href="/eventos/nuevo"
              className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-200 font-medium text-sm shadow-sm hover:shadow transition-all"
            >
              Nuevo evento
            </Link>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700 bg-slate-800">
            <h2 className="font-semibold text-white text-sm uppercase tracking-wider">
              Listado de eventos
            </h2>
            <p className="text-slate-300 text-xs mt-0.5">
              Todos los eventos registrados
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-semibold text-slate-900 uppercase tracking-wider bg-slate-50">
                  <th className="py-3 px-6">Nombre</th>
                  <th className="py-3 px-6">Fecha</th>
                  <th className="py-3 px-6">Tipo</th>
                  <th className="py-3 px-6">Cliente</th>
                  <th className="py-3 px-6">Estado</th>
                  <th className="py-3 px-6"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {eventos.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 font-medium text-slate-900">{e.nombre}</td>
                    <td className="py-4 px-6 text-slate-600">
                      {new Date(e.fecha).toLocaleDateString("es-AR")}
                    </td>
                    <td className="py-4 px-6 text-slate-600">{tipos[e.tipo] ?? e.tipo}</td>
                    <td className="py-4 px-6 text-slate-600">{e.cliente}</td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium ${
                          e.estado === "FACTURADO"
                            ? "bg-emerald-100 text-emerald-800"
                            : e.estado === "FINALIZADO"
                              ? "bg-sky-100 text-sky-800"
                              : e.estado === "CONFIRMADO"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {estados[e.estado] ?? e.estado}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <Link
                        href={`/eventos/${e.id}`}
                        className="text-sky-600 hover:text-sky-700 font-medium text-sm"
                      >
                        Ver
                      </Link>
                      {isAdmin && (
                        <>
                          {" · "}
                          <Link
                            href={`/eventos/${e.id}/editar`}
                            className="text-slate-600 hover:text-slate-900 text-sm"
                          >
                            Editar
                          </Link>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {eventos.length === 0 && (
            <p className="py-12 text-center text-slate-500">No hay eventos</p>
          )}
        </div>
      </main>
    </div>
  );
}
