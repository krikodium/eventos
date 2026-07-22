import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.permisos?.planillaUtilerosVerPagosDetalle) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { anticipo, montoTransferencia, montoEfectivo } = body;

    const data: Record<string, unknown> = {};
    if (anticipo !== undefined) data.anticipo = parseFloat(anticipo);
    if (montoTransferencia !== undefined) data.montoTransferencia = montoTransferencia === null || montoTransferencia === "" ? null : parseFloat(montoTransferencia);
    if (montoEfectivo !== undefined) data.montoEfectivo = montoEfectivo === null || montoEfectivo === "" ? null : parseFloat(montoEfectivo);

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });
    }

    const utileroEnEvento = await prisma.utileroEnEvento.update({
      where: { id },
      data,
    });
    return NextResponse.json(utileroEnEvento);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}
