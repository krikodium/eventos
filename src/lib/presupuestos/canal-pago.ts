/**
 * Canal de pago de una línea de presupuesto.
 *
 * Adaptado del modelo de decodashboard. Vive en un solo archivo porque el valor
 * viaja lejos: se elige en el editor, se imprime en el PDF y se agrupa en el
 * panel de estado de pagos.
 *
 * `A_DEFINIR` no es "sin dato": es una decisión pendiente con el proveedor, y
 * por eso se muestra aparte en los totales en vez de sumarse a efectivo.
 */

export const CANALES_PAGO = ["EFECTIVO", "TRANSFERENCIA", "A_DEFINIR"] as const;

export type CanalPago = (typeof CANALES_PAGO)[number];

export const CANAL_PAGO_DEFAULT: CanalPago = "EFECTIVO";

/** Etiqueta larga: formularios y PDF. */
export const CANAL_PAGO_LABEL: Record<CanalPago, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
  A_DEFINIR: "A definir con proveedor",
};

/** Etiqueta corta: chips y tablas densas. */
export const CANAL_PAGO_LABEL_CORTO: Record<CanalPago, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transfer.",
  A_DEFINIR: "A definir",
};

/**
 * Normaliza lo que venga de la base a un canal válido. Un valor desconocido
 * cae en el default en vez de romper el render.
 */
export function aCanalPago(valor: unknown): CanalPago {
  return CANALES_PAGO.includes(valor as CanalPago)
    ? (valor as CanalPago)
    : CANAL_PAGO_DEFAULT;
}

/** Para validar entrada de API: acá sí queremos rechazar, no normalizar. */
export function esCanalPagoValido(valor: unknown): valor is CanalPago {
  return typeof valor === "string" && (CANALES_PAGO as readonly string[]).includes(valor);
}

export const MONEDAS = ["ARS", "USD"] as const;
export type Moneda = (typeof MONEDAS)[number];

export function esMonedaValida(valor: unknown): valor is Moneda {
  return typeof valor === "string" && (MONEDAS as readonly string[]).includes(valor);
}
