/** Convierte un movimiento de caja chica a pesos (ARS). USD usa tipoCambioUsd del evento. */
export function montoCajaEnArs(
  monto: number,
  metodoPago: string | undefined,
  tipoCambioUsd: number | null | undefined
): number | "FALTA_TC" {
  const m = metodoPago ?? "EFECTIVO_ARS";
  if (!m.endsWith("_USD")) return monto;
  const tc = tipoCambioUsd ?? 0;
  if (!tc || tc <= 0) return "FALTA_TC";
  return monto * tc;
}

export const CAJA_SENTIDO_INGRESO = "INGRESO";
export const CAJA_SENTIDO_EGRESO = "EGRESO";

export function cajaSentidoEsEgreso(sentido: string | null | undefined): boolean {
  return (sentido ?? CAJA_SENTIDO_EGRESO) === CAJA_SENTIDO_EGRESO;
}

type FilaCaja = { monto: number; metodoPago?: string | null; sentido?: string | null };

function sumaPorSentido(
  filas: FilaCaja[],
  tipoCambioUsd: number | null | undefined,
  egreso: boolean
): number | "FALTA_TC" {
  let sum = 0;
  for (const f of filas) {
    if (cajaSentidoEsEgreso(f.sentido) !== egreso) continue;
    const v = montoCajaEnArs(f.monto, f.metodoPago ?? undefined, tipoCambioUsd);
    if (v === "FALTA_TC") return "FALTA_TC";
    sum += v;
  }
  return sum;
}

/** Suma egresos de caja en ARS (movimientos que salen de la caja). */
export function sumaEgresosCajaChicaEnArs(
  filas: FilaCaja[],
  tipoCambioUsd: number | null | undefined
): number | "FALTA_TC" {
  return sumaPorSentido(filas, tipoCambioUsd, true);
}

/** Suma ingresos a caja en ARS (movimientos que entran a la caja). */
export function sumaIngresosCajaChicaEnArs(
  filas: FilaCaja[],
  tipoCambioUsd: number | null | undefined
): number | "FALTA_TC" {
  return sumaPorSentido(filas, tipoCambioUsd, false);
}

/** Saldo neto en ARS: ingresos − egresos. */
export function saldoCajaChicaEnArs(
  filas: FilaCaja[],
  tipoCambioUsd: number | null | undefined
): number | "FALTA_TC" {
  const ing = sumaIngresosCajaChicaEnArs(filas, tipoCambioUsd);
  const egr = sumaEgresosCajaChicaEnArs(filas, tipoCambioUsd);
  if (ing === "FALTA_TC" || egr === "FALTA_TC") return "FALTA_TC";
  return ing - egr;
}

/** @deprecated Usar sumaEgresosCajaChicaEnArs (mismo comportamiento). */
export function sumaCajaChicaEnArs(
  filas: FilaCaja[],
  tipoCambioUsd: number | null | undefined
): number | "FALTA_TC" {
  return sumaEgresosCajaChicaEnArs(filas, tipoCambioUsd);
}
