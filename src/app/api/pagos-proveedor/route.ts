import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ROL_COMPROMISO, ROL_MOVIMIENTO } from "@/lib/pagos-proveedor-utils";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.permisos) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const p = session.user.permisos;

  try {
    const body = await req.json();
    const { eventoId, proveedorId, rubroId, monto, fecha, concepto, metodoPago, compromisoId, rol } = body;

    if (!eventoId || !proveedorId || !rubroId || monto == null) {
      return NextResponse.json(
        { error: "Faltan campos: eventoId, proveedorId, rubroId, monto" },
        { status: 400 }
      );
    }

    const rolIn = rol === ROL_COMPROMISO ? ROL_COMPROMISO : ROL_MOVIMIENTO;
    const tieneCompromisoId = Boolean(compromisoId);

    if (rolIn === ROL_COMPROMISO) {
      if (!p.cargaCompromisosProveedor) {
        return NextResponse.json({ error: "No autorizado a cargar cotizaciones" }, { status: 403 });
      }
      if (tieneCompromisoId) {
        return NextResponse.json({ error: "Un compromiso no puede referenciar otro" }, { status: 400 });
      }
      const pago = await prisma.pagoProveedor.create({
        data: {
          eventoId,
          proveedorId,
          rubroId,
          monto: parseFloat(monto),
          fecha: fecha ? new Date(fecha) : new Date(),
          concepto: concepto || null,
          metodoPago: metodoPago ?? "TRANSF_ARS",
          rol: ROL_COMPROMISO,
        },
      });
      return NextResponse.json(pago);
    }

    // MOVIMIENTO
    if (!p.registrarPagosProveedorMovimiento) {
      return NextResponse.json({ error: "No autorizado a registrar pagos" }, { status: 403 });
    }
    if (tieneCompromisoId) {
      const padre = await prisma.pagoProveedor.findFirst({
        where: { id: compromisoId as string, eventoId, rol: ROL_COMPROMISO },
      });
      if (!padre) {
        return NextResponse.json({ error: "Compromiso no encontrado para este evento" }, { status: 400 });
      }
    }

    const pago = await prisma.pagoProveedor.create({
      data: {
        eventoId,
        proveedorId,
        rubroId,
        monto: parseFloat(monto),
        fecha: fecha ? new Date(fecha) : new Date(),
        concepto: concepto || null,
        metodoPago: metodoPago ?? "TRANSF_ARS",
        rol: ROL_MOVIMIENTO,
        compromisoId: tieneCompromisoId ? (compromisoId as string) : null,
      },
    });
    return NextResponse.json(pago);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al crear pago" }, { status: 500 });
  }
}
