import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CAJA_SENTIDO_EGRESO, CAJA_SENTIDO_INGRESO, montoCajaEnArs } from "@/lib/caja-chica-pesos";
import { parseMontoPositivo, resolverMetodoPago } from "@/lib/metodos-pago";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.permisos?.cajaChicaVer) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { eventoId, monto, empleadaEncargada, concepto, metodoPago, sentido } = body;
    if (!eventoId || monto == null || !empleadaEncargada) {
      return NextResponse.json(
        { error: "Faltan campos: eventoId, monto, empleadaEncargada" },
        { status: 400 }
      );
    }
    const mp = resolverMetodoPago(metodoPago, "EFECTIVO_ARS");
    const sd =
      sentido === CAJA_SENTIDO_INGRESO ? CAJA_SENTIDO_INGRESO : CAJA_SENTIDO_EGRESO;
    const montoNum = parseMontoPositivo(monto);
    if (montoNum === null) {
      return NextResponse.json({ error: "El monto debe ser finito y mayor a cero" }, { status: 400 });
    }
    if (mp === null) {
      return NextResponse.json({ error: "Método de pago inválido" }, { status: 400 });
    }

    const evento = await prisma.evento.findUnique({
      where: { id: eventoId },
    });
    if (!evento) {
      return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
    }

    const enArs = montoCajaEnArs(montoNum, mp, evento.tipoCambioUsd);
    if (enArs === "FALTA_TC") {
      return NextResponse.json(
        {
          error:
            "Para movimientos en USD hace falta el tipo de cambio del evento. Cargalo arriba o pedile a un administrador.",
        },
        { status: 400 }
      );
    }

    const caja = await prisma.cajaChicaEvento.create({
      data: {
        eventoId,
        monto: montoNum,
        sentido: sd,
        empleadaEncargada,
        concepto: concepto || null,
        metodoPago: mp,
      },
    });
    return NextResponse.json(caja);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al registrar caja chica" }, { status: 500 });
  }
}
