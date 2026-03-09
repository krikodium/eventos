import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await req.json();
    const { eventoId, proveedorId, rubroId, monto, fecha, concepto, metodoPago } = body;
    if (!eventoId || !proveedorId || !rubroId || monto == null) {
      return NextResponse.json(
        { error: "Faltan campos: eventoId, proveedorId, rubroId, monto" },
        { status: 400 }
      );
    }
    const pago = await prisma.pagoProveedor.create({
      data: {
        eventoId,
        proveedorId,
        rubroId,
        monto: parseFloat(monto),
        fecha: fecha ? new Date(fecha) : new Date(),
        concepto: concepto || null,
        metodoPago: metodoPago ?? "TRANSFERENCIA",
      },
    });
    return NextResponse.json(pago);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al crear pago" }, { status: 500 });
  }
}
