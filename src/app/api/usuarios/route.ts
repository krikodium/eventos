import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { crearAccesoTemporal, normalizarEmail } from "@/lib/acceso-temporal";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const { email: rawEmail, role, eventosPermisos } = body;
    const email = normalizarEmail(rawEmail);
    const name = String(body.name ?? "").trim();
    if (!email || !name) {
      return NextResponse.json(
        { error: "Faltan campos: email, name" },
        { status: 400 }
      );
    }
    if (name.length > 100 || email.length > 254 || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: "Nombre o email no válidos" }, { status: 400 });
    }
    const existing = await prisma.eventosUsuario.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "El email ya está registrado" }, { status: 400 });
    }
    const isAdmin = role === "ADMIN";

    const acceso = await crearAccesoTemporal();
    const user = await prisma.eventosUsuario.create({
      data: {
        email,
        name,
        password: null,
        emailVerified: null,
        accesoTemporalHash: acceso.claveHash,
        accesoTemporalExpiraAt: acceso.expiraAt,
        accesoTemporalIntentos: 0,
        accesoTemporalBloqueadoHasta: null,
        role: isAdmin ? "ADMIN" : "EMPLEADO",
        ...(eventosPermisos && typeof eventosPermisos === "object" && !isAdmin
          ? { eventosPermisos: eventosPermisos as object }
          : {}),
      },
    });

    return NextResponse.json(
      {
        usuario: { id: user.id, email: user.email, name: user.name, role: user.role },
        accesoTemporal: { clave: acceso.clave, expiraAt: acceso.expiraAt.toISOString() },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al crear usuario" }, { status: 500 });
  }
}
