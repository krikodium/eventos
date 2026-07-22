import { hash } from "bcryptjs";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { validarPassword } from "@/lib/passwords";
import { hashRecoveryToken } from "@/lib/recuperacion";

export const dynamic = "force-dynamic";

async function resolverToken(token: string | null) {
  if (!token) return { error: "Falta el token de recuperación." } as const;
  const recuperacion = await prisma.eventosInvitacion.findUnique({
    where: { tokenHash: hashRecoveryToken(token) },
    select: { id: true, userId: true, usedAt: true, expiresAt: true },
  });
  if (!recuperacion || recuperacion.usedAt) {
    return { error: "El enlace no existe o ya fue utilizado." } as const;
  }
  if (recuperacion.expiresAt.getTime() < Date.now()) {
    return { error: "El enlace venció. Solicitá uno nuevo." } as const;
  }
  return recuperacion;
}

export async function GET(request: NextRequest) {
  const result = await resolverToken(request.nextUrl.searchParams.get("token"));
  if ("error" in result) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

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
    return NextResponse.json({ ok: false, error: "Las contraseñas no coinciden." }, { status: 400 });
  }

  const result = await resolverToken(body.token ?? null);
  if ("error" in result) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  const hashedPassword = await hash(password, 12);
  try {
    await prisma.$transaction(async (tx) => {
      const claim = await tx.eventosInvitacion.updateMany({
        where: { id: result.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (claim.count !== 1) throw new Error("TOKEN_CONSUMIDO");
      await tx.user.update({
        where: { id: result.userId },
        data: { password: hashedPassword },
      });
      await tx.eventosInvitacion.updateMany({
        where: { userId: result.userId, usedAt: null },
        data: { usedAt: new Date() },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "TOKEN_CONSUMIDO") {
      return NextResponse.json({ ok: false, error: "El enlace ya fue utilizado o venció." }, { status: 400 });
    }
    console.error("Error restableciendo contraseña:", error);
    return NextResponse.json({ ok: false, error: "No se pudo cambiar la contraseña." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
