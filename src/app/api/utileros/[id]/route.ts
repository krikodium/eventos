import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const {
      nombre,
      tarifaPorDia,
      tarifaArmado,
      tarifaDesarmeEvento,
      tarifaDesarmeDepo,
      tarifaGuardia,
    } = body;

    const data: Record<string, unknown> = {};
    if (nombre != null) data.nombre = nombre;
    if (tarifaPorDia != null) data.tarifaPorDia = parseFloat(tarifaPorDia);
    if (tarifaArmado !== undefined) data.tarifaArmado = tarifaArmado === null || tarifaArmado === "" ? null : parseFloat(tarifaArmado);
    if (tarifaDesarmeEvento !== undefined) data.tarifaDesarmeEvento = tarifaDesarmeEvento === null || tarifaDesarmeEvento === "" ? null : parseFloat(tarifaDesarmeEvento);
    if (tarifaDesarmeDepo !== undefined) data.tarifaDesarmeDepo = tarifaDesarmeDepo === null || tarifaDesarmeDepo === "" ? null : parseFloat(tarifaDesarmeDepo);
    if (tarifaGuardia !== undefined) data.tarifaGuardia = tarifaGuardia === null || tarifaGuardia === "" ? null : parseFloat(tarifaGuardia);

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });
    }

    const utilero = await prisma.utilero.update({
      where: { id },
      data,
    });
    return NextResponse.json(utilero);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al actualizar utilero" }, { status: 500 });
  }
}
