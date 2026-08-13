/**
 * Fuente única de verdad de los estados del dominio.
 * Antes cada pantalla definía sus propias etiquetas y colores, así que el
 * mismo estado se veía distinto según dónde lo miraras.
 */

export type EstadoTono = "neutral" | "accent" | "success" | "warning" | "danger";

export const ESTADO_EVENTO: Record<string, { label: string; tono: EstadoTono }> = {
  BORRADOR: { label: "Borrador", tono: "neutral" },
  CONFIRMADO: { label: "Confirmado", tono: "warning" },
  EN_CURSO: { label: "En curso", tono: "accent" },
  FINALIZADO: { label: "Finalizado", tono: "accent" },
  FACTURADO: { label: "Facturado", tono: "success" },
};

export const TIPO_EVENTO: Record<string, string> = {
  CORPORATIVO: "Corporativo",
  PARTICULAR: "Particular",
};

/** Tareas de utilero. Incluye las variantes históricas de armado. */
export const TIPO_TAREA: Record<string, string> = {
  ARMADO: "Armado",
  ARMADO_1: "Armado día 1",
  ARMADO_2: "Armado día 2",
  GUARDIA: "Guardia",
  EVENTO: "Día de evento",
  DESARME_EVENTO: "Desarme en evento",
  DESARME_DEPO: "Desarme en depósito",
};

/** Las tareas que se miden en días (el resto es precio por tarea). */
export const TAREAS_POR_DIA = new Set(["EVENTO", "ARMADO", "ARMADO_1", "ARMADO_2"]);

export function estadoEvento(estado: string): { label: string; tono: EstadoTono } {
  return ESTADO_EVENTO[estado] ?? { label: estado, tono: "neutral" };
}

/** Estado de cobro derivado de lo cotizado contra lo efectivamente registrado. */
export function estadoPago(
  cotizado: number,
  registrado: number
): { label: string; tono: EstadoTono; pendiente: number } {
  const pendiente = Math.max(0, cotizado - registrado);
  if (cotizado === 0) return { label: "Sin cotizar", tono: "neutral", pendiente: 0 };
  if (pendiente === 0) return { label: "Saldado", tono: "success", pendiente: 0 };
  if (registrado > 0) return { label: "Parcial", tono: "warning", pendiente };
  return { label: "Pendiente", tono: "danger", pendiente };
}
