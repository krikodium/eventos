import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEmailResend } from "@/lib/email/resend";
import { escapeHtml, getBaseUrl } from "@/lib/invitaciones";

export const RECUPERACION_TTL_MINUTOS = 60;

export function hashRecoveryToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function renderRecuperacionEmail(params: { nombre: string; url: string }): string {
  const nombre = escapeHtml(params.nombre);
  const url = escapeHtml(params.url);
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Restablecé tu contraseña</title></head>
<body style="margin:0;padding:0;background:#f4f5f7;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px;background:#f4f5f7;">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:500px;overflow:hidden;border:1px solid #e5e7eb;border-radius:18px;background:#ffffff;">
    <tr><td style="padding:26px 32px;background:#0b0d10;color:#ffffff;font-family:Arial,sans-serif;"><strong>Eventos HC</strong><div style="margin-top:4px;font-size:12px;color:#9ca3af;">Acceso seguro</div></td></tr>
    <tr><td style="padding:34px 32px 12px;font-family:Arial,sans-serif;color:#111827;">
      <div style="font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#0284c7;">Recuperación de acceso</div>
      <h1 style="margin:10px 0 14px;font-size:23px;">Hola ${nombre},</h1>
      <p style="margin:0;color:#52525b;font-size:14px;line-height:1.65;">Recibimos una solicitud para cambiar tu contraseña. El enlace es personal y vence en ${RECUPERACION_TTL_MINUTOS} minutos.</p>
    </td></tr>
    <tr><td style="padding:16px 32px 28px;"><a href="${url}" target="_blank" style="display:inline-block;padding:13px 24px;border-radius:10px;background:#0b0d10;color:#ffffff;font:600 14px Arial,sans-serif;text-decoration:none;">Crear nueva contraseña</a></td></tr>
    <tr><td style="padding:0 32px 28px;font:12px Arial,sans-serif;color:#71717a;word-break:break-all;">Si el botón no funciona, copiá este enlace:<br><span style="color:#0284c7;">${url}</span></td></tr>
    <tr><td style="padding:20px 32px;border-top:1px solid #e5e7eb;background:#fafafa;font:12px/1.6 Arial,sans-serif;color:#a1a1aa;">Si no pediste este cambio, ignorá el mensaje. Tu contraseña actual seguirá funcionando.</td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

export async function crearYEnviarRecuperacion(user: { id: string; email: string; name: string | null }) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashRecoveryToken(token);
  const expiresAt = new Date(Date.now() + RECUPERACION_TTL_MINUTOS * 60 * 1000);
  const recuperacion = await prisma.eventosInvitacion.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });
  const url = `${getBaseUrl()}/restablecer?token=${token}`;
  const nombre = user.name?.trim() || "equipo";
  const subject = "Restablecé tu contraseña • Eventos HC";
  const text = `Hola ${nombre},\n\nCreá una nueva contraseña desde este enlace:\n${url}\n\nEl enlace vence en ${RECUPERACION_TTL_MINUTOS} minutos. Si no pediste el cambio, ignorá este mensaje.`;

  try {
    await sendEmailResend({
      to: [user.email],
      subject,
      text,
      html: renderRecuperacionEmail({ nombre, url }),
      idempotencyKey: `recuperacion-${recuperacion.id}`,
    });
  } catch (error) {
    await prisma.eventosInvitacion.delete({ where: { id: recuperacion.id } }).catch(() => {});
    throw error;
  }

  await prisma.eventosInvitacion.updateMany({
    where: { userId: user.id, usedAt: null, id: { not: recuperacion.id } },
    data: { usedAt: new Date() },
  });
}
