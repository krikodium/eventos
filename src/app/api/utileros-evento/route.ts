import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.permisos?.planillaUtilerosVerPagosDetalle) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { eventoId, utileroId, anticipo, montoTransferencia, montoEfectivo } = body;
    if (!eventoId || !utileroId) {
      return NextResponse.json({ error: "Faltan eventoId o utileroId" }, { status: 400 });
    }

    const data = {
      anticipo: anticipo != null ? parseFloat(anticipo) : 0,
      montoTransferencia: montoTransferencia != null && montoTransferencia !== "" ? parseFloat(montoTransferencia) : null,
      montoEfectivo: montoEfectivo != null && montoEfectivo !== "" ? parseFloat(montoEfectivo) : null,
    };

    const existing = await prisma.utileroEnEvento.findUnique({
      where: { eventoId_utileroId: { eventoId, utileroId } },
    });

    const utileroEnEvento = existing
      ? await prisma.utileroEnEvento.update({
          where: { id: existing.id },
          data,
        })
      : await prisma.utileroEnEvento.create({
          data: { eventoId, utileroId, ...data },
        });
    return NextResponse.json(utileroEnEvento);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
  }
}
