import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { EventoDetalle } from "@/components/eventos/evento-detalle";
import { ResumenGastosEvento } from "@/components/eventos/resumen-gastos-evento";
import { DetallesEstadoPagos } from "@/components/eventos/detalles-estado-pagos";
import { DetallesEventoBasico } from "@/components/eventos/detalles-evento-basico";
import { totalMovimientosProveedor, esMovimientoPago } from "@/lib/pagos-proveedor-utils";
import {
  fetchCompromisosResumenForEventoRaw,
  fetchPagosMovimientoParaGraficoRaw,
  sumMovimientosProveedorEventoRaw,
} from "@/lib/pago-proveedor-raw";
import { cajaSentidoEsEgreso, sumaEgresosCajaChicaEnArs } from "@/lib/caja-chica-pesos";

export default async function EventoPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.permisos) redirect("/login");

  const { id } = await params;
  const evento = await prisma.evento.findUnique({
    where: { id },
    include: {
      pagosProveedores: { include: { proveedor: true, rubro: true } },
      diasUtileros: { include: { utilero: true } },
      utilerosEnEvento: { include: { utilero: true } },
      ingresos: true,
      cajaChica: true,
    },
  });

  if (!evento) notFound();

  const permisos = session.user.permisos;
  const isAdmin = session.user.role === "ADMIN";

  const compromisosResumen = await fetchCompromisosResumenForEventoRaw(id);

  const pagosGrafRaw = await fetchPagosMovimientoParaGraficoRaw(id);
  const pagosParaGrafico =
    pagosGrafRaw.length > 0 ? pagosGrafRaw : evento.pagosProveedores.filter(esMovimientoPago);

  const totalIngresos = evento.ingresos.reduce((s, i) => s + i.monto, 0);
  const totalPagosRaw = await sumMovimientosProveedorEventoRaw(id);
  const totalPagos =
    totalPagosRaw !== null ? totalPagosRaw : totalMovimientosProveedor(evento.pagosProveedores);
  const totalUtileros = evento.diasUtileros.reduce((s, d) => s + d.monto, 0);
  const totalCajaChicaAgg = sumaEgresosCajaChicaEnArs(evento.cajaChica, evento.tipoCambioUsd);
  const totalCajaChica =
    totalCajaChicaAgg === "FALTA_TC"
      ? evento.cajaChica.filter((c) => cajaSentidoEsEgreso(c.sentido)).reduce((s, c) => s + c.monto, 0)
      : totalCajaChicaAgg;
  const totalEgresos = totalPagos + totalUtileros + totalCajaChica;
  const balance = totalIngresos - totalEgresos;

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
    <div className="min-h-screen bg-[#f8f8f8]">
      <Navbar />
      <main className="py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-sm text-neutral-500 mb-4">
            <Link href="/eventos" className="hover:text-neutral-900 transition-colors">
              Eventos
            </Link>
            <span>/</span>
            <span className="text-neutral-900 font-medium truncate max-w-[200px] sm:max-w-none">
              {evento.nombre}
            </span>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
                {evento.nombre}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-2 text-neutral-600">
                <span className="text-sm">{tipos[evento.tipo]}</span>
                <span className="text-neutral-300">•</span>
                <span className="text-sm">{evento.cliente}</span>
                <span className="text-neutral-300">•</span>
                <span className="text-sm">
                  {new Date(evento.fecha).toLocaleDateString("es-AR", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              <span className="inline-flex mt-3 px-2.5 py-1 rounded-md text-xs font-medium border border-neutral-200 bg-neutral-100 text-neutral-800">
                {estados[evento.estado]}
              </span>
            </div>
            {isAdmin && (
              <Link
                href={`/eventos/${evento.id}/editar`}
                className="shrink-0 px-4 py-2.5 bg-white hover:bg-neutral-50 text-neutral-700 rounded-lg border border-neutral-200 font-medium text-sm shadow-sm hover:shadow transition-all"
              >
                Editar evento
              </Link>
            )}
          </div>

          <section className="mb-8">
            {permisos.eventoVerDetallePresupuestoCobros ? (
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
            ) : (
              <DetallesEventoBasico
                evento={{
                  nombre: evento.nombre,
                  fecha: evento.fecha,
                  tipo: evento.tipo,
                  cliente: evento.cliente,
                  descripcion: evento.descripcion,
                  organizadora: evento.organizadora,
                  provincia: evento.provincia,
                  localidad: evento.localidad,
                }}
              />
            )}
          </section>

          {permisos.eventoVerResumenTarjetas && (
            <section className="mb-8">
              <h2 className="sr-only">Resumen financiero</h2>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                <div className="bg-white rounded-xl p-4 sm:p-5 border border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-neutral-500 text-xs font-semibold uppercase tracking-wider mb-1">
                    Ingresos
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-neutral-900 tabular-nums">
                    ${totalIngresos.toLocaleString("es-AR")}
                  </p>
                </div>
                <div className="bg-white rounded-xl p-4 sm:p-5 border border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-neutral-500 text-xs font-semibold uppercase tracking-wider mb-1">
                    Proveedores
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-neutral-900 tabular-nums">
                    ${totalPagos.toLocaleString("es-AR")}
                  </p>
                </div>
                <div className="bg-white rounded-xl p-4 sm:p-5 border border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-neutral-500 text-xs font-semibold uppercase tracking-wider mb-1">
                    Utileros
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-neutral-900 tabular-nums">
                    ${totalUtileros.toLocaleString("es-AR")}
                  </p>
                </div>
                <div className="bg-white rounded-xl p-4 sm:p-5 border border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-neutral-500 text-xs font-semibold uppercase tracking-wider mb-1">
                    Caja chica
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-neutral-900 tabular-nums">
                    ${totalCajaChica.toLocaleString("es-AR")}
                  </p>
                  <p className="text-neutral-400 text-[11px] mt-1">Solo egresos (equiv. ARS si hay TC)</p>
                </div>
                <div className="bg-white rounded-xl p-4 sm:p-5 border border-neutral-200 shadow-sm hover:shadow-md transition-shadow col-span-2 lg:col-span-1">
                  <p className="text-neutral-500 text-xs font-semibold uppercase tracking-wider mb-1">
                    Balance
                  </p>
                  <p className="text-xl sm:text-2xl font-bold tabular-nums text-neutral-900">
                    ${balance.toLocaleString("es-AR")}
                  </p>
                </div>
              </div>
            </section>
          )}

          {permisos.eventoVerGraficoGastos && (
            <section className="mb-8">
              <ResumenGastosEvento
                pagos={pagosParaGrafico}
                diasUtileros={evento.diasUtileros}
                cajaChica={evento.cajaChica}
              />
            </section>
          )}
        </div>

        <section className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8">
          <EventoDetalle
            evento={evento}
            permisos={permisos}
            compromisosResumen={compromisosResumen}
            isAdmin={isAdmin}
            nombreUsuario={session.user.name ?? session.user.email ?? ""}
          />
        </section>
      </main>
    </div>
  );
}
