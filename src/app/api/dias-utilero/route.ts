import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TIPOS_VALIDOS = ["ARMADO", "GUARDIA", "DESARME_EVENTO", "DESARME_DEPO", "EVENTO"];

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await req.json();
    const { eventoId, utileroId, dias, tipo } = body;
    if (!eventoId || !utileroId || dias == null) {
      return NextResponse.json(
        { error: "Faltan campos: eventoId, utileroId, dias" },
        { status: 400 }
      );
    }
    const tipoFinal = TIPOS_VALIDOS.includes(tipo) ? tipo : "EVENTO";

    const utilero = await prisma.utilero.findUnique({ where: { id: utileroId } });
    if (!utilero) return NextResponse.json({ error: "Utilero no encontrado" }, { status: 404 });

    const diasNum = parseFloat(dias);
    const monto = diasNum * utilero.tarifaPorDia;

    const existing = await prisma.diaUtilero.findUnique({
      where: {
        eventoId_utileroId_tipo: { eventoId, utileroId, tipo: tipoFinal },
      },
    });

    const diaUtilero = existing
      ? await prisma.diaUtilero.update({
          where: { id: existing.id },
          data: {
            dias: existing.dias + diasNum,
            monto: (existing.dias + diasNum) * utilero.tarifaPorDia,
          },
        })
      : await prisma.diaUtilero.create({
          data: { eventoId, utileroId, dias: diasNum, monto, tipo: tipoFinal },
        });
    return NextResponse.json(diaUtilero);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al registrar días" }, { status: 500 });
  }
}
