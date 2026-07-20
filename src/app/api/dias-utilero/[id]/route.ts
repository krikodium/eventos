import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.permisos) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const perm = session.user.permisos;

  try {
    const { id } = await params;
    const body = await req.json();
    const { monto, dias, montoTransferencia, montoEfectivo } = body;

    const data: Record<string, unknown> = {};
    if (monto != null && monto !== "") {
      if (!perm.planillaUtilerosEditarTareas) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
      }
      data.monto = parseFloat(monto);
    }
    if (dias != null && dias !== "") {
      if (!perm.planillaUtilerosEditarTareas) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
      }
      data.dias = parseFloat(dias);
    }
    if (montoTransferencia !== undefined) {
      if (!perm.planillaUtilerosVerPagosDetalle) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
      }
      data.montoTransferencia =
        montoTransferencia === null || montoTransferencia === "" ? null : parseFloat(montoTransferencia);
    }
    if (montoEfectivo !== undefined) {
      if (!perm.planillaUtilerosVerPagosDetalle) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
      }
      data.montoEfectivo =
        montoEfectivo === null || montoEfectivo === "" ? null : parseFloat(montoEfectivo);
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });
    }

    const diaUtilero = await prisma.diaUtilero.update({
      where: { id },
      data,
    });
    return NextResponse.json(diaUtilero);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}
