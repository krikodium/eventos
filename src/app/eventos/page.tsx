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
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Eventos</h1>
          {isAdmin && (
            <Link
              href="/eventos/nuevo"
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-medium"
            >
              Nuevo evento
            </Link>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 text-gray-600 font-medium">Nombre</th>
                <th className="text-left py-3 px-4 text-gray-600 font-medium">Fecha</th>
                <th className="text-left py-3 px-4 text-gray-600 font-medium">Tipo</th>
                <th className="text-left py-3 px-4 text-gray-600 font-medium">Cliente</th>
                <th className="text-left py-3 px-4 text-gray-600 font-medium">Estado</th>
                <th className="text-left py-3 px-4 text-gray-600 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {eventos.map((e) => (
                <tr key={e.id} className="border-t border-gray-200 hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-900">{e.nombre}</td>
                  <td className="py-3 px-4 text-gray-600">
                    {new Date(e.fecha).toLocaleDateString("es-AR")}
                  </td>
                  <td className="py-3 px-4 text-gray-600">{tipos[e.tipo] ?? e.tipo}</td>
                  <td className="py-3 px-4 text-gray-600">{e.cliente}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        e.estado === "FACTURADO"
                          ? "bg-sky-100 text-sky-700"
                          : e.estado === "FINALIZADO"
                            ? "bg-gray-100 text-gray-700"
                            : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {estados[e.estado] ?? e.estado}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <Link
                      href={`/eventos/${e.id}`}
                      className="text-sky-600 hover:text-sky-700 font-medium"
                    >
                      Ver
                    </Link>
                    {isAdmin && (
                      <>
                        {" | "}
                        <Link
                          href={`/eventos/${e.id}/editar`}
                          className="text-gray-600 hover:text-gray-900"
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
          {eventos.length === 0 && (
            <p className="py-8 text-center text-gray-500">No hay eventos</p>
          )}
        </div>
      </main>
    </div>
  );
}
