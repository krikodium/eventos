import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const evento = await prisma.evento.findUnique({
    where: { id },
    include: {
      pagosProveedores: { include: { proveedor: true, rubro: true } },
      diasUtileros: { include: { utilero: true } },
      ingresos: true,
    },
  });
  if (!evento) return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
  return NextResponse.json(evento);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const { id } = await params;
  try {
    const body = await req.json();
    const { nombre, fecha, fechaFin, tipo, cliente, estado, descripcion } = body;
    const evento = await prisma.evento.update({
      where: { id },
      data: {
        ...(nombre && { nombre }),
        ...(fecha && { fecha: new Date(fecha) }),
        ...(fechaFin !== undefined && { fechaFin: fechaFin ? new Date(fechaFin) : null }),
        ...(tipo && { tipo }),
        ...(cliente && { cliente }),
        ...(estado && { estado }),
        ...(descripcion !== undefined && { descripcion: descripcion || null }),
      },
    });
    return NextResponse.json(evento);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al actualizar evento" }, { status: 500 });
  }
}
