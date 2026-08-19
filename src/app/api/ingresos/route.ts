import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseMontoPositivo, resolverMetodoPago } from "@/lib/metodos-pago";
import { esTipoIngresoValido } from "@/lib/ingresos";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo admins pueden registrar ingresos" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { eventoId, monto, concepto, fecha, tipo, numeroFactura, metodoPago } = body;
    if (!eventoId || monto == null) {
      return NextResponse.json({ error: "Faltan campos: eventoId, monto" }, { status: 400 });
    }
    const montoValido = parseMontoPositivo(monto);
    const metodoPagoValido = resolverMetodoPago(metodoPago, "TRANSF_ARS");
    if (montoValido === null) {
      return NextResponse.json({ error: "El monto debe ser finito y mayor a cero" }, { status: 400 });
    }
    if (metodoPagoValido === null) {
      return NextResponse.json({ error: "Método de pago inválido" }, { status: 400 });
    }
    // Antes se guardaba `tipo` sin validar: cualquier string entraba a la BD.
    const tipoIngreso = tipo ?? "PAGO";
    if (!esTipoIngresoValido(tipoIngreso)) {
      return NextResponse.json({ error: "Tipo de ingreso inválido" }, { status: 400 });
    }
    const ingreso = await prisma.ingreso.create({
      data: {
        eventoId,
        monto: montoValido,
        concepto: concepto || null,
        fecha: fecha ? new Date(fecha) : new Date(),
        tipo: tipoIngreso,
        numeroFactura: numeroFactura || null,
        metodoPago: metodoPagoValido,
      },
    });
    return NextResponse.json(ingreso);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al crear ingreso" }, { status: 500 });
  }
}
