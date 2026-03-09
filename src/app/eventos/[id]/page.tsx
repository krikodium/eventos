import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { EventoDetalle } from "@/components/eventos/evento-detalle";

export default async function EventoPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const evento = await prisma.evento.findUnique({
    where: { id },
    include: {
      pagosProveedores: { include: { proveedor: true, rubro: true } },
      diasUtileros: { include: { utilero: true } },
      ingresos: true,
      cajaChica: true,
    },
  });

  if (!evento) notFound();

  const totalIngresos = evento.ingresos.reduce((s, i) => s + i.monto, 0);
  const totalPagos = evento.pagosProveedores.reduce((s, p) => s + p.monto, 0);
  const totalUtileros = evento.diasUtileros.reduce((s, d) => s + d.monto, 0);
  const totalCajaChica = evento.cajaChica.reduce((s, c) => s + c.monto, 0);
  const totalEgresos = totalPagos + totalUtileros + totalCajaChica;
  const balance = totalIngresos - totalEgresos;

  const isAdmin = session.user.role === "ADMIN";
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
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <Link href="/eventos" className="text-sky-600 hover:text-sky-700 text-sm mb-2 inline-block">
              ← Volver a eventos
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">{evento.nombre}</h1>
            <p className="text-gray-600">
              {tipos[evento.tipo]} • {evento.cliente} •{" "}
              {new Date(evento.fecha).toLocaleDateString("es-AR")}
            </p>
            <span className="inline-block mt-2 px-2 py-1 rounded text-xs bg-gray-200 text-gray-700">
              {estados[evento.estado]}
            </span>
          </div>
          {isAdmin && (
            <Link
              href={`/eventos/${evento.id}/editar`}
              className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-lg border border-gray-300"
            >
              Editar
            </Link>
          )}
        </div>

        {/* Resumen financiero */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Ingresos</p>
            <p className="text-xl font-semibold text-sky-600">
              ${totalIngresos.toLocaleString("es-AR")}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Proveedores</p>
            <p className="text-xl font-semibold text-rose-600">
              ${totalPagos.toLocaleString("es-AR")}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Utileros</p>
            <p className="text-xl font-semibold text-rose-600">
              ${totalUtileros.toLocaleString("es-AR")}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Caja chica</p>
            <p className="text-xl font-semibold text-gray-700">
              ${totalCajaChica.toLocaleString("es-AR")}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Balance</p>
            <p
              className={`text-xl font-bold ${
                balance >= 0 ? "text-sky-600" : "text-rose-600"
              }`}
            >
              ${balance.toLocaleString("es-AR")}
            </p>
          </div>
        </div>

        <EventoDetalle
          evento={evento}
          isAdmin={isAdmin}
          totalIngresos={totalIngresos}
          totalPagos={totalPagos}
          totalUtileros={totalUtileros}
          totalCajaChica={totalCajaChica}
        />
      </main>
    </div>
  );
}
