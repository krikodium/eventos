import { compare, hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ACCESO_TEMPORAL_BLOQUEO_MINUTOS,
  ACCESO_TEMPORAL_MAX_INTENTOS,
  normalizarClaveTemporal,
  normalizarEmail,
  validarPasswordPermanente,
} from "@/lib/acceso-temporal";

const DUMMY_HASH = "$2b$12$bHgj66MzeN1iP/iVhd20we3S8Iv8.kdi94NBiOpYmcwTYoenRNK1i";
const ERROR_GENERICO = "El email o la clave temporal no son válidos, o el acceso venció.";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = normalizarEmail(body.email);
    const claveTemporal = normalizarClaveTemporal(body.claveTemporal);
    const password = String(body.password ?? "");
    const passwordConfirmacion = String(body.passwordConfirmacion ?? "");

    if (!email || !claveTemporal || !password || !passwordConfirmacion) {
      return NextResponse.json({ error: "Completá todos los campos." }, { status: 400 });
    }
    if (password !== passwordConfirmacion) {
      return NextResponse.json({ error: "Las contraseñas no coinciden." }, { status: 400 });
    }
    const passwordError = validarPasswordPermanente(password);
    if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });

    const user = await prisma.eventosUsuario.findUnique({
      where: { email },
      select: {
        id: true,
        accesoTemporalHash: true,
        accesoTemporalExpiraAt: true,
        accesoTemporalIntentos: true,
        accesoTemporalBloqueadoHasta: true,
      },
    });

    if (!user?.accesoTemporalHash || !user.accesoTemporalExpiraAt) {
      await compare(claveTemporal, DUMMY_HASH);
      return NextResponse.json({ error: ERROR_GENERICO }, { status: 400 });
    }

    const now = new Date();
    if (user.accesoTemporalBloqueadoHasta && user.accesoTemporalBloqueadoHasta > now) {
      return NextResponse.json(
        { error: "Demasiados intentos. Esperá 15 minutos antes de volver a probar." },
        { status: 429, headers: { "Retry-After": String(ACCESO_TEMPORAL_BLOQUEO_MINUTOS * 60) } }
      );
    }
    if (user.accesoTemporalExpiraAt <= now) {
      return NextResponse.json({ error: ERROR_GENERICO }, { status: 400 });
    }

    const esValida = await compare(claveTemporal, user.accesoTemporalHash);
    if (!esValida) {
      const intentosPrevios = user.accesoTemporalBloqueadoHasta ? 0 : user.accesoTemporalIntentos;
      const intentos = intentosPrevios + 1;
      const bloquear = intentos >= ACCESO_TEMPORAL_MAX_INTENTOS;
      await prisma.eventosUsuario.updateMany({
        where: { id: user.id, accesoTemporalHash: user.accesoTemporalHash },
        data: {
          accesoTemporalIntentos: bloquear ? 0 : intentos,
          accesoTemporalBloqueadoHasta: bloquear
            ? new Date(now.getTime() + ACCESO_TEMPORAL_BLOQUEO_MINUTOS * 60 * 1000)
            : null,
        },
      });
      return NextResponse.json(
        { error: bloquear ? "Demasiados intentos. Esperá 15 minutos antes de volver a probar." : ERROR_GENERICO },
        { status: bloquear ? 429 : 400 }
      );
    }

    const passwordHash = await hash(password, 12);
    const result = await prisma.eventosUsuario.updateMany({
      where: {
        id: user.id,
        accesoTemporalHash: user.accesoTemporalHash,
        accesoTemporalExpiraAt: { gt: now },
      },
      data: {
        password: passwordHash,
        accesoTemporalHash: null,
        accesoTemporalExpiraAt: null,
        accesoTemporalIntentos: 0,
        accesoTemporalBloqueadoHasta: null,
        authVersion: { increment: 1 },
      },
    });

    if (result.count !== 1) {
      return NextResponse.json({ error: ERROR_GENERICO }, { status: 409 });
    }

    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Error activando acceso temporal:", error);
    return NextResponse.json({ error: "No se pudo activar el acceso." }, { status: 500 });
  }
}
