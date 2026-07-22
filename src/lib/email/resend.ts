export type SendEmailInput = {
  to: string[];
  subject: string;
  text: string;
  html?: string;
  idempotencyKey?: string;
};

/** Envío de email vía Resend. Portado del proyecto DecoDashboard. */
export async function sendEmailResend(input: SendEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey) throw new Error("Email no configurado: falta RESEND_API_KEY.");
  if (!from) throw new Error("Email no configurado: falta EMAIL_FROM.");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(input.idempotencyKey ? { "Idempotency-Key": input.idempotencyKey } : {}),
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      ...(input.html ? { html: input.html } : {}),
    }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`No se pudo enviar email.${msg ? ` ${msg}` : ""}`);
  }

  return await res.json().catch(() => ({}));
}
