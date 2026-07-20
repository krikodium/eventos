import { randomBytes, createHash } from "crypto";
import { prisma } from "./prisma";
import { sendEmailResend } from "./email/resend";

/** Días de validez de una invitación. */
export const INVITACION_TTL_DIAS = 7;

/** Hash determinístico del token (guardamos el hash, nunca el token en claro). */
export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** URL base de la app para armar links absolutos en emails. */
export function getBaseUrl(): string {
  const explicit = process.env.APP_URL ?? process.env.NEXTAUTH_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

/** Escapa texto para interpolar de forma segura en el HTML del email. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Template HTML del email de invitación (tablas + estilos inline para máxima compatibilidad). */
export function renderInvitacionEmail(params: { nombre: string; url: string }): string {
  const nombre = escapeHtml(params.nombre);
  const url = escapeHtml(params.url);
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light">
<title>Confirmá tu cuenta</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:32px 12px;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e5e5;">
        <!-- Header -->
        <tr>
          <td style="background-color:#0a0a0a;padding:28px 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:40px;height:40px;background-color:#ffffff;border-radius:10px;text-align:center;vertical-align:middle;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;color:#0a0a0a;">HC</td>
                <td style="padding-left:12px;font-family:Arial,sans-serif;color:#ffffff;">
                  <div style="font-size:15px;font-weight:600;">Eventos HC</div>
                  <div style="font-size:12px;color:#a3a3a3;">Gestión integral</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 32px 8px 32px;font-family:Arial,sans-serif;">
            <p style="margin:0 0 6px 0;font-size:12px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#0284c7;">Activá tu cuenta</p>
            <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:#0a0a0a;">Hola ${nombre},</h1>
            <p style="margin:0 0 24px 0;font-size:14px;line-height:1.6;color:#525252;">
              Fuiste invitado a <strong style="color:#0a0a0a;">Eventos HC</strong>. Para activar tu cuenta y definir tu contraseña, hacé clic en el botón de abajo.
            </p>
          </td>
        </tr>
        <!-- Button -->
        <tr>
          <td style="padding:0 32px 28px 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background-color:#0a0a0a;border-radius:10px;">
                  <a href="${url}" target="_blank" style="display:inline-block;padding:13px 28px;font-family:Arial,sans-serif;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Activar mi cuenta</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Fallback link -->
        <tr>
          <td style="padding:0 32px 28px 32px;font-family:Arial,sans-serif;">
            <p style="margin:0 0 6px 0;font-size:12px;color:#737373;">O copiá y pegá este enlace en tu navegador:</p>
            <p style="margin:0;font-size:12px;color:#0284c7;word-break:break-all;">${url}</p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #e5e5e5;background-color:#fafafa;font-family:Arial,sans-serif;">
            <p style="margin:0;font-size:12px;line-height:1.6;color:#a3a3a3;">
              El enlace vence en ${INVITACION_TTL_DIAS} días. Si no esperabas esta invitación, podés ignorar este mensaje de forma segura.
            </p>
          </td>
        </tr>
      </table>
      <p style="margin:16px 0 0 0;font-family:Arial,sans-serif;font-size:11px;color:#a3a3a3;">Eventos HC · Sistema interno de gestión</p>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/**
 * Crea (o renueva) una invitación para un usuario y le envía el email de confirmación.
 * Invalida invitaciones previas sin usar del mismo usuario.
 */
export async function crearYEnviarInvitacion(user: { id: string; email: string; name: string | null }) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashInviteToken(token);
  const expiresAt = new Date(Date.now() + INVITACION_TTL_DIAS * 24 * 60 * 60 * 1000);

  // Primero conservamos cualquier enlace anterior: si el email nuevo falla,
  // el usuario todavía puede utilizar la invitación que ya recibió.
  const invitacion = await prisma.eventosInvitacion.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  const url = `${getBaseUrl()}/registro?token=${token}`;
  const nombre = user.name?.trim() || "equipo";

  const subject = "Activá tu cuenta • Eventos HC";
  const text =
    `Hola ${nombre},\n\n` +
    `Fuiste invitado a Eventos HC. Para activar tu cuenta y definir tu contraseña, ` +
    `abrí este enlace:\n\n${url}\n\n` +
    `El enlace vence en ${INVITACION_TTL_DIAS} días. Si no esperabas esta invitación, ignorá este mensaje.\n\n` +
    `Eventos HC · Sistema interno de gestión`;

  const html = renderInvitacionEmail({ nombre, url });

  try {
    await sendEmailResend({
      to: [user.email],
      subject,
      text,
      html,
      idempotencyKey: `invitacion-${invitacion.id}`,
    });
  } catch (error) {
    await prisma.eventosInvitacion.delete({ where: { id: invitacion.id } }).catch(() => {});
    throw error;
  }

  await prisma.eventosInvitacion.updateMany({
    where: { userId: user.id, usedAt: null, id: { not: invitacion.id } },
    data: { usedAt: new Date() },
  });

  return { expiresAt };
}
