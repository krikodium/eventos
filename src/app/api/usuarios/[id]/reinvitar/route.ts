import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { crearYEnviarInvitacion } from "@/lib/invitaciones";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, password: true },
  });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  if (user.password) {
    return NextResponse.json(
      { error: "El usuario ya activó su cuenta." },
      { status: 400 }
    );
  }

  try {
    await crearYEnviarInvitacion(user);
  } catch (mailErr) {
    console.error("Error reenviando invitación:", mailErr);
    return NextResponse.json(
      { error: mailErr instanceof Error ? mailErr.message : "No se pudo enviar la invitación" },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
