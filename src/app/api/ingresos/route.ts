import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo admins pueden registrar ingresos" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { eventoId, monto, concepto, fecha, tipo, numeroFactura } = body;
    if (!eventoId || monto == null) {
      return NextResponse.json({ error: "Faltan campos: eventoId, monto" }, { status: 400 });
    }
    const ingreso = await prisma.ingreso.create({
      data: {
        eventoId,
        monto: parseFloat(monto),
        concepto: concepto || null,
        fecha: fecha ? new Date(fecha) : new Date(),
        tipo: tipo ?? "FACTURACION",
        numeroFactura: numeroFactura || null,
      },
    });
    return NextResponse.json(ingreso);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al crear ingreso" }, { status: 500 });
  }
}
