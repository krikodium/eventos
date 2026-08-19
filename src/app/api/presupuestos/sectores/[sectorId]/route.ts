import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function guard() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  return null;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ sectorId: string }> }
) {
  const denied = await guard();
  if (denied) return denied;

  try {
    const { sectorId } = await params;
    const sector = await prisma.presupuestoSector.findUnique({
      where: { id: sectorId },
      select: { id: true, presupuestoId: true, grupoOpcion: true },
    });
    if (!sector) {
      return NextResponse.json({ error: "Sector no encontrado" }, { status: 404 });
    }

    const body = await req.json();
    const data: {
      nombre?: string;
      grupoOpcion?: string | null;
      elegido?: boolean;
      orden?: number;
    } = {};

    if (typeof body.nombre === "string" && body.nombre.trim()) data.nombre = body.nombre.trim();
    if ("grupoOpcion" in body) {
      data.grupoOpcion =
        typeof body.grupoOpcion === "string" && body.grupoOpcion.trim()
          ? body.grupoOpcion.trim()
          : null;
    }
    if (typeof body.orden === "number" && Number.isFinite(body.orden)) data.orden = body.orden;

    // Elegir una alternativa desmarca a las demás del mismo grupo: sin esto,
    // dos opciones elegidas sumarían las dos al total vigente.
    if (typeof body.elegido === "boolean") {
      data.elegido = body.elegido;
      const grupo = data.grupoOpcion !== undefined ? data.grupoOpcion : sector.grupoOpcion;
      if (body.elegido && grupo) {
        const actualizado = await prisma.$transaction(async (tx) => {
          await tx.presupuestoSector.updateMany({
            where: {
              presupuestoId: sector.presupuestoId,
              grupoOpcion: grupo,
              id: { not: sectorId },
            },
            data: { elegido: false },
          });
          return tx.presupuestoSector.update({ where: { id: sectorId }, data });
        });
        return NextResponse.json(actualizado);
      }
    }

    const actualizado = await prisma.presupuestoSector.update({
      where: { id: sectorId },
      data,
    });
    return NextResponse.json(actualizado);
  } catch (err) {
    console.error("PATCH sector:", err);
    return NextResponse.json({ error: "Error al actualizar el sector" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ sectorId: string }> }
) {
  const denied = await guard();
  if (denied) return denied;

  try {
    const { sectorId } = await params;
    // Las líneas caen por ON DELETE CASCADE.
    await prisma.presupuestoSector.delete({ where: { id: sectorId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE sector:", err);
    return NextResponse.json({ error: "Error al eliminar el sector" }, { status: 500 });
  }
}
