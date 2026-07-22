import { SMTPClient } from "emailjs";
import { sendEmailResend, type SendEmailInput } from "./resend";

type EmailProvider = "gmail" | "resend";

let gmailClient: SMTPClient | null = null;

function getProvider(): EmailProvider {
  const configured = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  if (!configured) {
    return process.env.SMTP_USER && process.env.SMTP_PASS ? "gmail" : "resend";
  }
  if (configured !== "gmail" && configured !== "resend") {
    throw new Error("Email no configurado: EMAIL_PROVIDER debe ser gmail o resend.");
  }
  return configured;
}

function getGmailClient(): SMTPClient {
  if (gmailClient) return gmailClient;

  const user = process.env.SMTP_USER?.trim();
  // Google muestra la contraseña en grupos de cuatro; Nodemailer necesita el valor continuo.
  const pass = process.env.SMTP_PASS?.replace(/\s+/g, "");
  if (!user) throw new Error("Email no configurado: falta SMTP_USER.");
  if (!pass) throw new Error("Email no configurado: falta SMTP_PASS.");

  gmailClient = new SMTPClient({
    host: "smtp.gmail.com",
    port: 465,
    ssl: true,
    user,
    password: pass,
    timeout: 30_000,
  });

  return gmailClient;
}

async function sendEmailGmail(input: SendEmailInput) {
  const from = process.env.EMAIL_FROM?.trim();
  if (!from) throw new Error("Email no configurado: falta EMAIL_FROM.");

  try {
    await getGmailClient().sendAsync({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      attachment: input.html
        ? [{ data: input.html, alternative: true, type: "text/html" }]
        : undefined,
    });
    return { provider: "gmail" as const };
  } catch {
    // No propagamos detalles del proveedor: pueden contener datos operativos sensibles.
    throw new Error("No se pudo enviar el email mediante Gmail.");
  }
}

/** Transporte único para invitaciones y recuperación, seleccionado solo en el servidor. */
export async function sendEmail(input: SendEmailInput) {
  return getProvider() === "gmail"
    ? sendEmailGmail(input)
    : sendEmailResend(input);
}
