const EMAILS_FINANZAS = new Set([
  "gestion@hermanascaradonti.com",
  "pagos@hermanascaradonti.com",
  "administracion@hermanascaradonti.com",
]);

type IdentidadFinanzas = { email?: string | null } | null | undefined;

/** Acceso explícito: Mateo, Arturo y Graciela. No depende del rol ADMIN. */
export function puedeVerFinanzas(usuario: IdentidadFinanzas): boolean {
  const email = usuario?.email?.trim().toLowerCase();
  return email ? EMAILS_FINANZAS.has(email) : false;
}
