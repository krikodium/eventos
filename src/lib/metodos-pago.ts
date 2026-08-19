export const METODOS_PAGO = [
  "EFECTIVO_ARS",
  "EFECTIVO_USD",
  "TRANSF_ARS",
  "TRANSF_USD",
] as const;

export type MetodoPago = (typeof METODOS_PAGO)[number];

export function metodoPagoValido(valor: unknown): valor is MetodoPago {
  return typeof valor === "string" && (METODOS_PAGO as readonly string[]).includes(valor);
}

export function resolverMetodoPago(
  valor: unknown,
  predeterminado: MetodoPago
): MetodoPago | null {
  const candidato = valor ?? predeterminado;
  return metodoPagoValido(candidato) ? candidato : null;
}

function textoDecimal(valor: unknown): string | null {
  if (typeof valor !== "number" && typeof valor !== "string") return null;
  const texto = String(valor).trim();
  return texto === "" ? null : texto;
}

/**
 * Parsea centavos desde texto decimal, sin multiplicar un float binario.
 * La política de montos admite como máximo dos decimales; no redondea entradas.
 */
export function parseMontoPositivo(valor: unknown): number | null {
  const texto = textoDecimal(valor);
  const partes = texto?.match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!partes) return null;
  const enteros = BigInt(partes[1]);
  const decimales = BigInt((partes[2] ?? "").padEnd(2, "0"));
  const centavosBigInt = enteros * BigInt(100) + decimales;
  if (centavosBigInt <= BigInt(0) || centavosBigInt > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  return Number(centavosBigInt) / 100;
}

/** TC USD→ARS: decimal positivo completo, con hasta seis decimales. */
export function parseTipoCambioUsd(valor: unknown): number | null {
  const texto = textoDecimal(valor);
  if (!texto || !/^\d+(?:\.\d{1,6})?$/.test(texto)) return null;
  const tipoCambio = Number(texto);
  return Number.isFinite(tipoCambio) && tipoCambio > 0 ? tipoCambio : null;
}
