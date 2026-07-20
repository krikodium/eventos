import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ROL_MOVIMIENTO } from "@/lib/pagos-proveedor-utils";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.permisos) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const perm = session.user.permisos;

  try {
    const { id } = await params;
    const row = await prisma.pagoProveedor.findUnique({
      where: { id },
      include: { _count: { select: { pagosHijos: true } } },
    });
    if (!row) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    if (row.rol === ROL_MOVIMIENTO) {
      if (!perm.eliminarPagosProveedor) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
      }
      await prisma.pagoProveedor.delete({ where: { id } });
      return NextResponse.json({ ok: true });
    }

    // COMPROMISO
    if (row._count.pagosHijos > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar: hay pagos registrados sobre este compromiso" },
        { status: 400 }
      );
    }
    if (perm.eliminarPagosProveedor) {
      await prisma.pagoProveedor.delete({ where: { id } });
      return NextResponse.json({ ok: true });
    }
    if (perm.cargaCompromisosProveedor) {
      await prisma.pagoProveedor.delete({ where: { id } });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
  }
}
