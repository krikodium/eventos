import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validarLinea } from "@/lib/presupuestos/validar-linea";

async function guard() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  return null;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ lineaId: string }> }
) {
  const denied = await guard();
  if (denied) return denied;

  try {
    const { lineaId } = await params;
    const actual = await prisma.presupuestoLinea.findUnique({ where: { id: lineaId } });
    if (!actual) {
      return NextResponse.json({ error: "Línea no encontrada" }, { status: 404 });
    }

    const body = await req.json();
    // Se revalida la línea completa (mezcla de lo guardado con lo que llega):
    // así un PATCH parcial no puede dejar un estado inválido en la base.
    const validacion = validarLinea({
      item: body.item ?? actual.item,
      descripcion: "descripcion" in body ? body.descripcion : actual.descripcion,
      cantidad: body.cantidad ?? actual.cantidad,
      costoUnitario: body.costoUnitario ?? actual.costoUnitario,
      precioUnitario: body.precioUnitario ?? actual.precioUnitario,
      moneda: body.moneda ?? actual.moneda,
      canalPago: body.canalPago ?? actual.canalPago,
      proveedorId: "proveedorId" in body ? body.proveedorId : actual.proveedorId,
      aprobadoCliente:
        "aprobadoCliente" in body ? body.aprobadoCliente : actual.aprobadoCliente,
      deshabilitado: "deshabilitado" in body ? body.deshabilitado : actual.deshabilitado,
    });
    if (!validacion.ok) {
      return NextResponse.json({ error: validacion.error }, { status: 400 });
    }

    if (validacion.linea.proveedorId) {
      const proveedor = await prisma.proveedorEvento.findUnique({
        where: { id: validacion.linea.proveedorId },
        select: { id: true },
      });
      if (!proveedor) {
        return NextResponse.json({ error: "Proveedor inexistente" }, { status: 400 });
      }
    }

    const linea = await prisma.presupuestoLinea.update({
      where: { id: lineaId },
      data: validacion.linea,
      include: { proveedor: { select: { id: true, nombre: true } } },
    });
    return NextResponse.json(linea);
  } catch (err) {
    console.error("PATCH linea:", err);
    return NextResponse.json({ error: "Error al actualizar la línea" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ lineaId: string }> }
) {
  const denied = await guard();
  if (denied) return denied;

  try {
    const { lineaId } = await params;
    await prisma.presupuestoLinea.delete({ where: { id: lineaId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE linea:", err);
    return NextResponse.json({ error: "Error al eliminar la línea" }, { status: 500 });
  }
}
