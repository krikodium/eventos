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

  const kpiAccent: Record<string, { tint: string; chip: string; bar: string }> = {
    emerald: { tint: "from-white to-emerald-50/70", chip: "bg-emerald-50 text-emerald-700", bar: "from-emerald-300 to-emerald-500" },
    orange: { tint: "from-white to-orange-50/70", chip: "bg-orange-50 text-orange-700", bar: "from-orange-300 to-orange-500" },
    violet: { tint: "from-white to-violet-50/70", chip: "bg-violet-50 text-violet-700", bar: "from-violet-300 to-violet-500" },
    amber: { tint: "from-white to-amber-50/70", chip: "bg-amber-50 text-amber-700", bar: "from-amber-300 to-amber-500" },
    rose: { tint: "from-white to-rose-50/70", chip: "bg-rose-50 text-rose-700", bar: "from-rose-300 to-rose-500" },
  };

  const kpiEvento: {
    label: string;
    value: number;
    accent: keyof typeof kpiAccent;
    sub?: string;
    icon: React.ReactNode;
  }[] = [
    { label: "Ingresos", value: totalIngresos, accent: "emerald", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="m7 11 5-5 5 5M12 6v12" /> },
    { label: "Proveedores", value: totalPagos, accent: "orange", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M3 7h13v10H3zM16 10h3l2 3v4h-5m-6 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm10 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z" /> },
    { label: "Utileros", value: totalUtileros, accent: "violet", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M17 20h5v-1a4 4 0 0 0-4-4h-1m-4 5v-1a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v1h11Zm-2-11a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm8 1a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z" /> },
    { label: "Caja chica", value: totalCajaChica, accent: "amber", sub: "Solo egresos (equiv. ARS si hay TC)", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M21 12H3m18 0v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6m18 0-2.5-6h-13L3 12" /> },
  ];

  return (
    <div className="min-h-screen bg-background">
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
                {kpiEvento.map((card) => {
                  const a = kpiAccent[card.accent];
                  return (
                    <div
                      key={card.label}
                      className={`group relative overflow-hidden rounded-2xl border border-neutral-200 bg-gradient-to-br ${a.tint} p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:p-5`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">{card.label}</p>
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${a.chip} transition-transform group-hover:scale-110`}>
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">{card.icon}</svg>
                        </span>
                      </div>
                      <p className="mt-3 text-xl font-bold tabular-nums text-neutral-900 sm:text-2xl">
                        ${card.value.toLocaleString("es-AR")}
                      </p>
                      {card.sub && <p className="mt-1 text-[11px] text-neutral-400">{card.sub}</p>}
                      <div className={`mt-3 h-1 w-full rounded-full bg-gradient-to-r ${a.bar} opacity-70 transition-opacity group-hover:opacity-100`} />
                    </div>
                  );
                })}
                <div className={`group relative overflow-hidden rounded-2xl border p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:p-5 col-span-2 lg:col-span-1 ${balance >= 0 ? "border-emerald-100 bg-gradient-to-br from-white to-emerald-50" : "border-rose-100 bg-gradient-to-br from-white to-rose-50"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-[11px] font-semibold uppercase tracking-wider ${balance >= 0 ? "text-emerald-700" : "text-rose-700"}`}>Balance</p>
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-110 ${balance >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M4 19V5m0 14h16M8 15l3-3 3 2 5-7" />
                      </svg>
                    </span>
                  </div>
                  <p className={`mt-3 text-xl font-bold tabular-nums sm:text-2xl ${balance >= 0 ? "text-emerald-900" : "text-rose-800"}`}>
                    {balance < 0 ? "-$" : "$"}{Math.abs(balance).toLocaleString("es-AR")}
                  </p>
                  <div className={`mt-3 h-1 w-full rounded-full bg-gradient-to-r opacity-70 transition-opacity group-hover:opacity-100 ${balance >= 0 ? "from-emerald-300 to-emerald-500" : "from-rose-300 to-rose-500"}`} />
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
