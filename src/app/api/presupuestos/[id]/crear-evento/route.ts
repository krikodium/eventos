import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const presupuesto = await prisma.presupuesto.findUnique({ where: { id } });
    if (!presupuesto) return NextResponse.json({ error: "Presupuesto no encontrado" }, { status: 404 });

    const evento = await prisma.evento.create({
      data: {
        nombre: presupuesto.evento,
        fecha: presupuesto.fecha,
        tipo: "PARTICULAR",
        cliente: presupuesto.cliente,
        estado: presupuesto.estadoEvento,
        organizadora: presupuesto.empresa || null,
        presupuestoTotal: presupuesto.total,
        presupuestoNro: presupuesto.presupuestoNro || null,
        formaPagoAcordada: presupuesto.formaPago || null,
      },
    });

    return NextResponse.json(evento);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al crear evento desde presupuesto" }, { status: 500 });
  }
}
