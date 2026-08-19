import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Solo admin toca la estructura del presupuesto. */
async function guard() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  return null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await guard();
  if (denied) return denied;

  const { id } = await params;
  const sectores = await prisma.presupuestoSector.findMany({
    where: { presupuestoId: id },
    orderBy: { orden: "asc" },
    include: {
      lineas: {
        orderBy: { orden: "asc" },
        include: { proveedor: { select: { id: true, nombre: true } } },
      },
    },
  });
  return NextResponse.json(sectores);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await guard();
  if (denied) return denied;

  try {
    const { id } = await params;
    const presupuesto = await prisma.presupuesto.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!presupuesto) {
      return NextResponse.json({ error: "Presupuesto no encontrado" }, { status: 404 });
    }

    const body = await req.json();
    const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
    if (!nombre) {
      return NextResponse.json({ error: "El sector necesita un nombre" }, { status: 400 });
    }

    const grupoOpcion =
      typeof body.grupoOpcion === "string" && body.grupoOpcion.trim()
        ? body.grupoOpcion.trim()
        : null;

    const ultimo = await prisma.presupuestoSector.findFirst({
      where: { presupuestoId: id },
      orderBy: { orden: "desc" },
      select: { orden: true },
    });

    const sector = await prisma.presupuestoSector.create({
      data: {
        presupuestoId: id,
        nombre,
        grupoOpcion,
        orden: (ultimo?.orden ?? -1) + 1,
      },
      include: { lineas: true },
    });

    return NextResponse.json(sector);
  } catch (err) {
    console.error("POST sectores:", err);
    return NextResponse.json({ error: "Error al crear el sector" }, { status: 500 });
  }
}
