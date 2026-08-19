import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validarLinea } from "@/lib/presupuestos/validar-linea";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ sectorId: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const { sectorId } = await params;
    // El sector manda el presupuestoId: no se toma del body para que nadie
    // pueda colgar una línea de un presupuesto ajeno.
    const sector = await prisma.presupuestoSector.findUnique({
      where: { id: sectorId },
      select: { id: true, presupuestoId: true },
    });
    if (!sector) {
      return NextResponse.json({ error: "Sector no encontrado" }, { status: 404 });
    }

    const body = await req.json();
    const validacion = validarLinea(body);
    if (!validacion.ok) {
      return NextResponse.json({ error: validacion.error }, { status: 400 });
    }

    if (validacion.linea.proveedorId) {
      const proveedor = await prisma.proveedorEvento.findUnique({
        where: { id: validacion.linea.proveedorId },
        select: { id: true },
      });
      if (!proveedor) {
        return NextResponse.json({ error: "Proveedor inexistente" }, { status: 400 });
      }
    }

    const ultimo = await prisma.presupuestoLinea.findFirst({
      where: { sectorId },
      orderBy: { orden: "desc" },
      select: { orden: true },
    });

    const linea = await prisma.presupuestoLinea.create({
      data: {
        ...validacion.linea,
        presupuestoId: sector.presupuestoId,
        sectorId,
        orden: (ultimo?.orden ?? -1) + 1,
      },
      include: { proveedor: { select: { id: true, nombre: true } } },
    });

    return NextResponse.json(linea);
  } catch (err) {
    console.error("POST linea:", err);
    return NextResponse.json({ error: "Error al crear la línea" }, { status: 500 });
  }
}
