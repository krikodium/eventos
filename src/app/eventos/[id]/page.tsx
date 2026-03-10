import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { EventoDetalle } from "@/components/eventos/evento-detalle";
import { ResumenGastosEvento } from "@/components/eventos/resumen-gastos-evento";
import { DetallesEstadoPagos } from "@/components/eventos/detalles-estado-pagos";

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
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb y header */}
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-4">
          <Link href="/eventos" className="hover:text-sky-600 transition-colors">
            Eventos
          </Link>
          <span>/</span>
          <span className="text-slate-900 font-medium truncate max-w-[200px] sm:max-w-none">
            {evento.nombre}
          </span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {evento.nombre}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-slate-600">
              <span className="text-sm">{tipos[evento.tipo]}</span>
              <span className="text-slate-300">•</span>
              <span className="text-sm">{evento.cliente}</span>
              <span className="text-slate-300">•</span>
              <span className="text-sm">
                {new Date(evento.fecha).toLocaleDateString("es-AR", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
            <span
              className={`inline-flex mt-3 px-2.5 py-1 rounded-md text-xs font-medium ${
                evento.estado === "FACTURADO"
                  ? "bg-emerald-100 text-emerald-800"
                  : evento.estado === "FINALIZADO"
                    ? "bg-sky-100 text-sky-800"
                    : evento.estado === "CONFIRMADO"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-slate-200 text-slate-700"
              }`}
            >
              {estados[evento.estado]}
            </span>
          </div>
          {isAdmin && (
            <Link
              href={`/eventos/${evento.id}/editar`}
              className="shrink-0 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-200 font-medium text-sm shadow-sm hover:shadow transition-all"
            >
              Editar evento
            </Link>
          )}
        </div>

        {/* Detalles del evento y Estado de pagos */}
        <section className="mb-8">
          <DetallesEstadoPagos
            evento={{
              nombre: evento.nombre,
              fecha: evento.fecha,
              tipo: evento.tipo,
              cliente: evento.cliente,
              descripcion: evento.descripcion,
              organizadora: evento.organizadora,
              provincia: evento.provincia,
              localidad: evento.localidad,
              presupuestoTotal: evento.presupuestoTotal,
              presupuestoNro: evento.presupuestoNro,
              formaPagoAcordada: evento.formaPagoAcordada,
              honorariosHC: evento.honorariosHC,
              viaticosArmado: evento.viaticosArmado,
            }}
            ingresos={evento.ingresos}
          />
        </section>

        {/* Resumen financiero */}
        <section className="mb-8">
          <h2 className="sr-only">Resumen financiero</h2>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
                Ingresos
              </p>
              <p className="text-xl sm:text-2xl font-bold text-emerald-600 tabular-nums">
                ${totalIngresos.toLocaleString("es-AR")}
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
                Proveedores
              </p>
              <p className="text-xl sm:text-2xl font-bold text-rose-600 tabular-nums">
                ${totalPagos.toLocaleString("es-AR")}
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
                Utileros
              </p>
              <p className="text-xl sm:text-2xl font-bold text-rose-600 tabular-nums">
                ${totalUtileros.toLocaleString("es-AR")}
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
                Caja chica
              </p>
              <p className="text-xl sm:text-2xl font-bold text-slate-700 tabular-nums">
                ${totalCajaChica.toLocaleString("es-AR")}
              </p>
            </div>
            <div
              className={`bg-white rounded-xl p-4 sm:p-5 border shadow-sm hover:shadow-md transition-shadow col-span-2 lg:col-span-1 ${
                balance >= 0
                  ? "border-emerald-200/60"
                  : "border-rose-200/60"
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
          </div>
        </section>

        <section className="mb-8">
          <ResumenGastosEvento
            pagos={evento.pagosProveedores}
            diasUtileros={evento.diasUtileros}
            cajaChica={evento.cajaChica}
          />
        </section>

        <section>
          <EventoDetalle
          evento={evento}
          isAdmin={isAdmin}
          totalIngresos={totalIngresos}
          totalPagos={totalPagos}
          totalUtileros={totalUtileros}
          totalCajaChica={totalCajaChica}
        />
        </section>
      </main>
    </div>
  );
}
