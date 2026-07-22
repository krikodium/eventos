import { NextResponse, type NextRequest } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { hashInviteToken } from "@/lib/invitaciones";
import { validarPassword } from "@/lib/passwords";

export const dynamic = "force-dynamic";

type InvitacionValida = {
  invitacionId: string;
  userId: string;
  email: string;
  name: string | null;
};

/** Busca una invitación por token y valida que sea usable. Devuelve error legible o los datos. */
async function resolverInvitacion(
  token: string | null
): Promise<{ error: string } | InvitacionValida> {
  if (!token) return { error: "Falta el token de invitación." };

  const tokenHash = hashInviteToken(token);
  const invitacion = await prisma.eventosInvitacion.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      usedAt: true,
      expiresAt: true,
      user: { select: { id: true, email: true, name: true, password: true } },
    },
  });

  if (!invitacion) return { error: "La invitación no existe o el link es inválido." };
  if (invitacion.usedAt || invitacion.user.password) {
    return { error: "Esta invitación ya fue utilizada. Iniciá sesión con tu contraseña." };
  }
  if (invitacion.expiresAt.getTime() < Date.now()) {
    return { error: "La invitación venció. Pedile a un administrador que te reenvíe una nueva." };
  }

  return {
    invitacionId: invitacion.id,
    userId: invitacion.user.id,
    email: invitacion.user.email,
    name: invitacion.user.name,
  };
}

/** Valida el token (para mostrar el formulario). */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const result = await resolverInvitacion(token);
  if ("error" in result) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, email: result.email, name: result.name });
}

/** Setea la contraseña y activa la cuenta. */
export async function POST(request: NextRequest) {
  let body: { token?: string; password?: string; confirmation?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Solicitud inválida." }, { status: 400 });
  }

  const password = String(body.password ?? "");
  const confirmation = String(body.confirmation ?? "");

  const passwordError = validarPassword(password);
  if (passwordError) {
    return NextResponse.json({ ok: false, error: passwordError }, { status: 400 });
  }
  if (password !== confirmation) {
    return NextResponse.json(
      { ok: false, error: "Las contraseñas no coinciden." },
      { status: 400 }
    );
  }

  const result = await resolverInvitacion(body.token ?? null);
  if ("error" in result) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  const hashedPassword = await hash(password, 12);

  // Consumo atómico: reclamamos la invitación (usedAt null -> ahora) y sólo si la
  // reclamamos nosotros seteamos la contraseña. Evita usos concurrentes del mismo token.
  try {
    await prisma.$transaction(async (tx) => {
      const claim = await tx.eventosInvitacion.updateMany({
        where: { id: result.invitacionId, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (claim.count !== 1) {
        throw new Error("INVITACION_YA_USADA");
      }
      const activation = await tx.user.updateMany({
        where: { id: result.userId, password: null },
        data: { password: hashedPassword, emailVerified: new Date() },
      });
      if (activation.count !== 1) throw new Error("INVITACION_YA_USADA");
    });
  } catch (e) {
    if (e instanceof Error && e.message === "INVITACION_YA_USADA") {
      return NextResponse.json(
        { ok: false, error: "Esta invitación ya fue utilizada. Iniciá sesión con tu contraseña." },
        { status: 400 }
      );
    }
    console.error("Error confirmando invitación:", e);
    return NextResponse.json(
      { ok: false, error: "No se pudo activar la cuenta. Probá de nuevo." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
