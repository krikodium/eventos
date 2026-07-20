import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PERMISO_KEYS, type EventosPermisos } from "@/lib/permisos";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!target) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  if (target.role === "ADMIN") {
    return NextResponse.json({ error: "No se modifican permisos de administradores" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const raw = body.eventosPermisos;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return NextResponse.json({ error: "Falta eventosPermisos (objeto)" }, { status: 400 });
    }

    const permisos = {} as EventosPermisos;
    for (const k of PERMISO_KEYS) {
      if (typeof raw[k] !== "boolean") {
        return NextResponse.json({ error: `eventosPermisos.${k} debe ser booleano` }, { status: 400 });
      }
      permisos[k] = raw[k];
    }

    await prisma.user.update({
      where: { id },
      data: { eventosPermisos: permisos as object },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al guardar permisos" }, { status: 500 });
  }
}
