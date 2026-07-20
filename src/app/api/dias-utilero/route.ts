import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TIPOS_VALIDOS = ["ARMADO_1", "ARMADO_2", "ARMADO", "GUARDIA", "DESARME_EVENTO", "DESARME_DEPO", "EVENTO"];

function getMontoDefault(
  utilero: { tarifaPorDia: number; tarifaArmado: number | null; tarifaDesarmeEvento: number | null; tarifaDesarmeDepo: number | null; tarifaGuardia: number | null },
  tipo: string,
  dias: number
): number {
  switch (tipo) {
    case "ARMADO_1":
    case "ARMADO_2":
    case "ARMADO":
      return utilero.tarifaArmado ?? utilero.tarifaPorDia;
    case "GUARDIA":
      return utilero.tarifaGuardia ?? utilero.tarifaPorDia;
    case "DESARME_EVENTO":
      return utilero.tarifaDesarmeEvento ?? utilero.tarifaPorDia;
    case "DESARME_DEPO":
      return utilero.tarifaDesarmeDepo ?? utilero.tarifaPorDia;
    case "EVENTO":
    default:
      return dias * utilero.tarifaPorDia;
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.permisos) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const perm = session.user.permisos;
  if (!perm.planillaUtilerosAgregar && !perm.planillaUtilerosEditarTareas) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { eventoId, utileroId, dias, tipo, monto, montoTransferencia, montoEfectivo } = body;
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
    const montoFinal =
      monto != null && monto !== ""
        ? parseFloat(monto)
        : getMontoDefault(utilero, tipoFinal, diasNum);

    const existing = await prisma.diaUtilero.findUnique({
      where: {
        eventoId_utileroId_tipo: { eventoId, utileroId, tipo: tipoFinal },
      },
    });

    // Pagos por tarea: no sumamos, reemplazamos/creamos
    const data: {
      dias: number;
      monto: number;
      montoTransferencia?: number | null;
      montoEfectivo?: number | null;
    } = {
      dias: diasNum,
      monto: montoFinal,
    };

    if (montoTransferencia != null && montoTransferencia !== "") {
      if (!perm.planillaUtilerosVerPagosDetalle) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
      }
      data.montoTransferencia = parseFloat(montoTransferencia);
    }
    if (montoEfectivo != null && montoEfectivo !== "") {
      if (!perm.planillaUtilerosVerPagosDetalle) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
      }
      data.montoEfectivo = parseFloat(montoEfectivo);
    }

    const diaUtilero = existing
      ? await prisma.diaUtilero.update({
          where: { id: existing.id },
          data,
        })
      : await prisma.diaUtilero.create({
          data: {
            eventoId,
            utileroId,
            dias: data.dias,
            monto: data.monto,
            tipo: tipoFinal,
            montoTransferencia: data.montoTransferencia ?? null,
            montoEfectivo: data.montoEfectivo ?? null,
          },
        });
    return NextResponse.json(diaUtilero);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al registrar tarea" }, { status: 500 });
  }
}
