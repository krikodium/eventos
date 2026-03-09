import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await req.json();
    const { eventoId, monto, empleadaEncargada, concepto } = body;
    if (!eventoId || monto == null || !empleadaEncargada) {
      return NextResponse.json(
        { error: "Faltan campos: eventoId, monto, empleadaEncargada" },
        { status: 400 }
      );
    }
    const caja = await prisma.cajaChica.create({
      data: {
        eventoId,
        monto: parseFloat(monto),
        empleadaEncargada,
        concepto: concepto || null,
      },
    });
    return NextResponse.json(caja);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al registrar caja chica" }, { status: 500 });
  }
}
