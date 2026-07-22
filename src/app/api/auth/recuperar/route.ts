import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { crearYEnviarRecuperacion } from "@/lib/recuperacion";

export const dynamic = "force-dynamic";

const RESPUESTA_GENERICA =
  "Si existe una cuenta activa con ese email, vas a recibir un enlace para recuperar el acceso.";

export async function POST(request: Request) {
  let email = "";
  try {
    const body = await request.json();
    email = String(body.email ?? "").trim().toLowerCase();
  } catch {
    return NextResponse.json({ ok: false, error: "Solicitud inválida." }, { status: 400 });
  }

  if (!email || !email.includes("@")) {
    return NextResponse.json({ ok: false, error: "Ingresá un email válido." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, password: true },
  });

  if (user?.password) {
    const cooldown = new Date(Date.now() - 60 * 1000);
    const reciente = await prisma.eventosInvitacion.findFirst({
      where: { userId: user.id, usedAt: null, createdAt: { gte: cooldown } },
      select: { id: true },
    });

    if (!reciente) {
      try {
        await crearYEnviarRecuperacion(user);
      } catch (error) {
        console.error("Error enviando recuperación de contraseña:", error);
      }
    }
  }

  return NextResponse.json({ ok: true, message: RESPUESTA_GENERICA });
}
