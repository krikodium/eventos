import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { PageHeader } from "@/components/layout/page-header";
import { prisma } from "@/lib/prisma";
import { EditorSectores, type SectorDTO } from "@/components/presupuestos/editor-sectores";
import { PanelEstadoPagos } from "@/components/presupuestos/panel-estado-pagos";
import type { LineaParaPago, PagoRegistrado } from "@/lib/presupuestos/estado-pagos";
import type { Moneda } from "@/lib/presupuestos/canal-pago";
import { ROL_MOVIMIENTO } from "@/lib/pagos-proveedor-utils";

/** ARS/USD del método de pago del movimiento (EFECTIVO_USD, TRANSF_ARS, …). */
function monedaDeMetodo(metodo: string): Moneda {
  return metodo.endsWith("_USD") ? "USD" : "ARS";
}

export default async function PresupuestoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.permisos) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/presupuestos");

  const { id } = await params;

  const presupuesto = await prisma.presupuesto.findUnique({
    where: { id },
    include: {
      sectores: {
        orderBy: { orden: "asc" },
        include: {
          lineas: {
            orderBy: { orden: "asc" },
            include: { proveedor: { select: { id: true, nombre: true } } },
          },
        },
      },
    },
  });
  if (!presupuesto) notFound();

  const proveedores = await prisma.proveedorEvento.findMany({
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true },
  });

  // Lo pagado sale de los movimientos del evento vinculado. Sin evento todavía
  // no hay plata girada, así que el panel muestra todo pendiente.
  let pagos: PagoRegistrado[] = [];
  if (presupuesto.eventoId) {
    const movimientos = await prisma.pagoProveedor.findMany({
      where: { eventoId: presupuesto.eventoId, rol: ROL_MOVIMIENTO },
      select: { proveedorId: true, monto: true, metodoPago: true },
    });
    pagos = movimientos.map((m) => ({
      proveedorId: m.proveedorId,
      monto: m.monto,
      moneda: monedaDeMetodo(m.metodoPago),
    }));
  }

  const sectores: SectorDTO[] = presupuesto.sectores.map((s) => ({
    id: s.id,
    nombre: s.nombre,
    orden: s.orden,
    grupoOpcion: s.grupoOpcion,
    elegido: s.elegido,
    lineas: s.lineas.map((l) => ({
      id: l.id,
      sectorId: l.sectorId,
      orden: l.orden,
      item: l.item,
      descripcion: l.descripcion,
      cantidad: l.cantidad,
      costoUnitario: l.costoUnitario,
      precioUnitario: l.precioUnitario,
      moneda: l.moneda,
      canalPago: l.canalPago,
      proveedorId: l.proveedorId,
      aprobadoCliente: l.aprobadoCliente,
      deshabilitado: l.deshabilitado,
      proveedor: l.proveedor,
    })),
  }));

  const lineasParaPago: LineaParaPago[] = presupuesto.sectores.flatMap((s) =>
    s.lineas.map((l) => ({
      id: l.id,
      item: l.item,
      sectorNombre: s.nombre,
      sectorGrupoOpcion: s.grupoOpcion,
      sectorElegido: s.elegido,
      cantidad: l.cantidad,
      costoUnitario: l.costoUnitario,
      moneda: l.moneda as Moneda,
      canalPago: l.canalPago,
      proveedorId: l.proveedorId,
      proveedorNombre: l.proveedor?.nombre ?? null,
      deshabilitado: l.deshabilitado,
    }))
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-[1480px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <nav className="mb-4 flex items-center gap-2 text-sm text-neutral-500">
          <Link href="/presupuestos" className="transition-colors hover:text-neutral-900">
            Presupuestos
          </Link>
          <span className="text-neutral-300">/</span>
          <span className="truncate font-medium text-neutral-900">{presupuesto.evento}</span>
        </nav>

        <PageHeader
          eyebrow="Comercial"
          title={presupuesto.evento}
          description={`${presupuesto.cliente}${
            presupuesto.presupuestoNro ? ` · Presupuesto Nº ${presupuesto.presupuestoNro}` : ""
          }`}
          status={presupuesto.eventoId ? "Vinculado a evento" : "Sin evento"}
        />

        <div className="space-y-6">
          <EditorSectores
            presupuestoId={presupuesto.id}
            sectoresIniciales={sectores}
            proveedores={proveedores}
          />
          <PanelEstadoPagos lineas={lineasParaPago} pagos={pagos} />
        </div>
      </main>
    </div>
  );
}
