import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { crearYEnviarInvitacion } from "@/lib/invitaciones";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const { email: rawEmail, name, role, eventosPermisos } = body;
    const email = String(rawEmail ?? "").trim().toLowerCase();
    if (!email || !name) {
      return NextResponse.json(
        { error: "Faltan campos: email, name" },
        { status: 400 }
      );
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "El email ya está registrado" }, { status: 400 });
    }
    const isAdmin = role === "ADMIN";

    // Se crea SIN contraseña: el invitado la define al confirmar el email.
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: null,
        emailVerified: null,
        role: isAdmin ? "ADMIN" : "VENDEDOR",
        ...(eventosPermisos && typeof eventosPermisos === "object" && !isAdmin
          ? { eventosPermisos: eventosPermisos as object }
          : {}),
      },
    });

    try {
      await crearYEnviarInvitacion(user);
    } catch (mailErr) {
      // El usuario quedó creado pero el email falló: lo borramos para no dejar una cuenta huérfana.
      await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
      console.error("Error enviando invitación:", mailErr);
      return NextResponse.json(
        { error: mailErr instanceof Error ? mailErr.message : "No se pudo enviar la invitación" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      invitado: true,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al crear usuario" }, { status: 500 });
  }
}
