import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { crearAccesoTemporal } from "@/lib/acceso-temporal";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  if (id === session.user.id) {
    return NextResponse.json(
      { error: "No podés restablecer tu propio acceso desde una sesión activa." },
      { status: 400 }
    );
  }

  const target = await prisma.eventosUsuario.findUnique({
    where: { id },
    select: { id: true, email: true, name: true },
  });
  if (!target) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const acceso = await crearAccesoTemporal();
  await prisma.eventosUsuario.update({
    where: { id },
    data: {
      password: null,
      accesoTemporalHash: acceso.claveHash,
      accesoTemporalExpiraAt: acceso.expiraAt,
      accesoTemporalIntentos: 0,
      accesoTemporalBloqueadoHasta: null,
      authVersion: { increment: 1 },
    },
  });

  return NextResponse.json(
    {
      usuario: target,
      accesoTemporal: { clave: acceso.clave, expiraAt: acceso.expiraAt.toISOString() },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
