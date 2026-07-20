import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.permisos) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const isAdmin = session.user.role === "ADMIN";
  if (!isAdmin && !session.user.permisos.navPresupuestos) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const presupuesto = await prisma.presupuesto.findUnique({ where: { id } });
    if (!presupuesto) return NextResponse.json({ error: "Presupuesto no encontrado" }, { status: 404 });
    return NextResponse.json(presupuesto);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al obtener presupuesto" }, { status: 500 });
  }
}

export async function PUT(
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
      empresa, cliente, evento, fecha, validez, presupuestoNro, formaPago,
      total, items, estadoEvento,
      honorariosTipo, honorariosMonto, honorariosConcepto,
      cargasSocialesPct, impuestosPct,
    } = body;

    const presupuesto = await prisma.presupuesto.update({
      where: { id },
      data: {
        ...(empresa !== undefined && { empresa: empresa || null }),
        ...(cliente !== undefined && { cliente }),
        ...(evento !== undefined && { evento }),
        ...(fecha !== undefined && { fecha: new Date(fecha) }),
        ...(validez !== undefined && { validez: Number(validez) > 0 ? Number(validez) : 15 }),
        ...(presupuestoNro !== undefined && { presupuestoNro: presupuestoNro || null }),
        ...(formaPago !== undefined && { formaPago: formaPago || null }),
        ...(total !== undefined && { total: Number(total) || 0 }),
        ...(items !== undefined && Array.isArray(items) && { items }),
        ...(estadoEvento !== undefined && {
          estadoEvento: ["BORRADOR", "CONFIRMADO", "EN_CURSO"].includes(estadoEvento)
            ? estadoEvento
            : "BORRADOR",
        }),
        ...(honorariosTipo !== undefined && { honorariosTipo: honorariosTipo === "FIJO" ? "FIJO" : "PORCENTAJE" }),
        ...(honorariosMonto !== undefined && { honorariosMonto: Number(honorariosMonto) || 0 }),
        ...(honorariosConcepto !== undefined && { honorariosConcepto: honorariosConcepto || "Honorarios HC" }),
        ...(cargasSocialesPct !== undefined && { cargasSocialesPct: Number(cargasSocialesPct) || 0 }),
        ...(impuestosPct !== undefined && { impuestosPct: Number(impuestosPct) || 0 }),
      },
    });

    return NextResponse.json(presupuesto);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al actualizar presupuesto" }, { status: 500 });
  }
}
