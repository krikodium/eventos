import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { EstadoEventoBadge } from "@/components/ui/estado-badge";
import { TIPO_EVENTO } from "@/lib/estados";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { EventoDetalle } from "@/components/eventos/evento-detalle";
import { CargaRapida, type TipoMov } from "@/components/eventos/carga-rapida";
import { SeccionesNav, type ItemSeccion, type SeccionId } from "@/components/eventos/secciones-nav";
import { CabeceraFinanciera, PresupuestosDelEvento } from "@/components/eventos/resumen-evento";
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

const SECCIONES: SeccionId[] = ["resumen", "cobros", "pagos", "utileros", "caja"];

export default async function EventoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ s?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.permisos) redirect("/login");

  const { id } = await params;
  const { s } = await searchParams;
  const pedida: SeccionId = SECCIONES.includes(s as SeccionId) ? (s as SeccionId) : "resumen";

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

  const [proveedoresCarga, utilerosCarga, presupuestos] = await Promise.all([
    prisma.proveedorEvento.findMany({
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, rubroId: true },
    }),
    prisma.utilero.findMany({
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, tarifaPorDia: true },
    }),
    prisma.presupuesto
      .findMany({
        where: { eventoId: id },
        orderBy: { createdAt: "desc" },
        select: { id: true, evento: true, total: true, presupuestoNro: true, createdAt: true },
      })
      .catch(() => []),
  ]);

  const compromisosResumen = await fetchCompromisosResumenForEventoRaw(id);
  const pagosGrafRaw = await fetchPagosMovimientoParaGraficoRaw(id);
  const pagosParaGrafico =
    pagosGrafRaw.length > 0 ? pagosGrafRaw : evento.pagosProveedores.filter(esMovimientoPago);

  const totalIngresos = evento.ingresos.reduce((sum, i) => sum + i.monto, 0);
  const totalPagosRaw = await sumMovimientosProveedorEventoRaw(id);
  const totalPagos =
    totalPagosRaw !== null ? totalPagosRaw : totalMovimientosProveedor(evento.pagosProveedores);
  const totalUtileros = evento.diasUtileros.reduce((sum, d) => sum + d.monto, 0);
  const totalCajaChicaAgg = sumaEgresosCajaChicaEnArs(evento.cajaChica, evento.tipoCambioUsd);
  const totalCajaChica =
    totalCajaChicaAgg === "FALTA_TC"
      ? evento.cajaChica
          .filter((c) => cajaSentidoEsEgreso(c.sentido))
          .reduce((sum, c) => sum + c.monto, 0)
      : totalCajaChicaAgg;
  const totalEgresos = totalPagos + totalUtileros + totalCajaChica;
  const balance = totalIngresos - totalEgresos;

  // Qué secciones ve este usuario, según sus permisos.
  const verCobros = permisos.eventoVerTabIngresos;
  const verPagos =
    permisos.cargaCompromisosProveedor ||
    permisos.verMovimientosProveedorDetalle ||
    permisos.registrarPagosProveedorMovimiento;
  const verUtileros =
    permisos.planillaUtilerosAgregar ||
    permisos.planillaUtilerosEditarTareas ||
    permisos.planillaUtilerosVerPagosDetalle;
  const verCaja = permisos.cajaChicaVer;

  const items: ItemSeccion[] = [{ id: "resumen", label: "Detalle" }];
  if (verCobros) items.push({ id: "cobros", label: "Cobros", badge: evento.ingresos.length });
  if (verPagos) items.push({ id: "pagos", label: "Pagos", badge: evento.pagosProveedores.length });
  if (verUtileros)
    items.push({ id: "utileros", label: "Utileros", badge: evento.diasUtileros.length });
  if (verCaja) items.push({ id: "caja", label: "Caja chica", badge: evento.cajaChica.length });

  // Si la sección pedida no está permitida, cae al detalle.
  const activa = items.some((i) => i.id === pedida) ? pedida : "resumen";

  // El panel de carga muestra solo el tipo de la sección donde estás.
  const tiposPorSeccion: Record<SeccionId, TipoMov[]> = {
    resumen: [],
    cobros: isAdmin ? ["INGRESO"] : [],
    pagos: isAdmin || permisos.registrarPagosProveedorMovimiento ? ["PROVEEDOR"] : [],
    utileros: isAdmin || permisos.planillaUtilerosAgregar ? ["UTILERO"] : [],
    caja: isAdmin || permisos.cajaChicaVer ? ["CAJA"] : [],
  };

  const fichaEvento = {
    nombre: evento.nombre,
    fecha: evento.fecha,
    tipo: evento.tipo,
    cliente: evento.cliente,
    descripcion: evento.descripcion,
    organizadora: evento.organizadora,
    provincia: evento.provincia,
    localidad: evento.localidad,
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
        <nav className="mb-3 flex items-center gap-2 text-[13px] text-neutral-500">
          <Link href="/eventos" className="transition-colors hover:text-neutral-900">
            Eventos
          </Link>
          <span className="text-neutral-300">/</span>
          <span className="max-w-[220px] truncate font-medium text-neutral-900 sm:max-w-none">
            {evento.nombre}
          </span>
        </nav>

        <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-[-0.02em] text-neutral-950 sm:text-[28px]">
                {evento.nombre}
              </h1>
              <EstadoEventoBadge estado={evento.estado} dot />
            </div>
            <p className="mt-1.5 text-[13px] text-neutral-500">
              {TIPO_EVENTO[evento.tipo] ?? evento.tipo}
              <span className="mx-1.5 text-neutral-300">·</span>
              {evento.cliente}
              <span className="mx-1.5 text-neutral-300">·</span>
              {new Date(evento.fecha).toLocaleDateString("es-AR", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
          {isAdmin && (
            <Link
              href={`/eventos/${evento.id}/editar`}
              className="shrink-0 rounded-md border border-neutral-300 bg-white px-4 py-2 text-[13px] font-medium text-neutral-700 transition hover:bg-neutral-50"
            >
              Editar evento
            </Link>
          )}
        </header>

        <SeccionesNav items={items} activa={activa} />

        {tiposPorSeccion[activa].length > 0 && (
          <CargaRapida
            eventoId={evento.id}
            proveedores={proveedoresCarga}
            utileros={utilerosCarga}
            compromisos={compromisosResumen.map((c) => ({
              id: c.id,
              etiqueta: `${c.proveedorNombre} · $${c.montoTotal.toLocaleString("es-AR")}`,
            }))}
            nombreUsuario={session.user.name ?? session.user.email ?? ""}
            permitidos={tiposPorSeccion[activa]}
            puedeCargarCompromiso={isAdmin || permisos.cargaCompromisosProveedor}
          />
        )}

        {activa === "resumen" ? (
          <div className="space-y-6">
            {permisos.eventoVerResumenTarjetas && (
              <CabeceraFinanciera
                presupuesto={evento.presupuestoTotal ?? 0}
                cobrado={totalIngresos}
                egresos={totalEgresos}
                balance={balance}
              />
            )}

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
              <div className="space-y-6">
                {permisos.eventoVerDetallePresupuestoCobros ? (
                  <DetallesEstadoPagos
                    evento={{
                      ...fichaEvento,
                      presupuestoTotal: evento.presupuestoTotal,
                      presupuestoNro: evento.presupuestoNro,
                      formaPagoAcordada: evento.formaPagoAcordada,
                      honorariosHC: evento.honorariosHC,
                      viaticosArmado: evento.viaticosArmado,
                    }}
                    ingresos={evento.ingresos}
                  />
                ) : (
                  <DetallesEventoBasico evento={fichaEvento} />
                )}
              </div>

              <PresupuestosDelEvento presupuestos={presupuestos} eventoId={evento.id} />
            </div>

            {permisos.eventoVerGraficoGastos && (
              <ResumenGastosEvento
                pagos={pagosParaGrafico}
                diasUtileros={evento.diasUtileros}
                cajaChica={evento.cajaChica}
              />
            )}
          </div>
        ) : (
          <EventoDetalle
            evento={evento}
            permisos={permisos}
            compromisosResumen={compromisosResumen}
            isAdmin={isAdmin}
            nombreUsuario={session.user.name ?? session.user.email ?? ""}
            seccion={activa}
          />
        )}
      </main>
    </div>
  );
}
