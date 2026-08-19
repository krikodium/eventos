/**
 * Tipos de ingreso (cobros al cliente).
 *
 * Reemplaza al esquema viejo (FACTURACION | ANTICIPO | PAGO_PARCIAL), donde
 * "Facturación" mezclaba el hecho fiscal con el cobro y "Pago parcial" no
 * distinguía el primero del tercero.
 *
 * La numeración de los pagos NO se guarda: se deriva del orden cronológico.
 * Guardarla obligaría a renumerar al borrar o corregir una fecha, y cualquier
 * olvido dejaría dos "Pago 2" conviviendo.
 */

export const TIPO_INGRESO = {
  SENA: "Seña",
  ANTICIPO: "Anticipo",
  PAGO: "Pago",
} as const;

export type TipoIngreso = keyof typeof TIPO_INGRESO;

export const TIPOS_INGRESO_VALIDOS = Object.keys(TIPO_INGRESO) as TipoIngreso[];

export function esTipoIngresoValido(valor: unknown): valor is TipoIngreso {
  return typeof valor === "string" && (TIPOS_INGRESO_VALIDOS as string[]).includes(valor);
}

/** Equivalencias del esquema viejo, para leer datos previos a la migración. */
const LEGADO: Record<string, TipoIngreso> = {
  FACTURACION: "PAGO",
  PAGO_PARCIAL: "PAGO",
};

/** Normaliza un tipo almacenado (incluye los legados) a uno vigente. */
export function normalizarTipoIngreso(valor: string): TipoIngreso {
  if (esTipoIngresoValido(valor)) return valor;
  return LEGADO[valor] ?? "PAGO";
}

type IngresoBase = { id: string; tipo: string; fecha: Date | string };

/**
 * Etiqueta de cada ingreso del evento. Los de tipo PAGO se numeran por orden
 * cronológico (Pago 1, Pago 2, …); seña y anticipo van sin número porque hay
 * uno solo de cada uno en la práctica.
 *
 * Devuelve un mapa id -> etiqueta para no recalcular por fila.
 */
export function etiquetasIngresos(ingresos: IngresoBase[]): Map<string, string> {
  const etiquetas = new Map<string, string>();

  const pagos = ingresos
    .filter((i) => normalizarTipoIngreso(i.tipo) === "PAGO")
    .sort((a, b) => {
      const ta = new Date(a.fecha).getTime();
      const tb = new Date(b.fecha).getTime();
      // Ante misma fecha, el id ordena de forma estable.
      return ta === tb ? a.id.localeCompare(b.id) : ta - tb;
    });

  for (const ingreso of ingresos) {
    const tipo = normalizarTipoIngreso(ingreso.tipo);
    if (tipo !== "PAGO") {
      etiquetas.set(ingreso.id, TIPO_INGRESO[tipo]);
      continue;
    }
    const orden = pagos.findIndex((p) => p.id === ingreso.id) + 1;
    etiquetas.set(ingreso.id, pagos.length > 1 ? `Pago ${orden}` : "Pago");
  }

  return etiquetas;
}

/** Cuántos pagos ya existen: sirve para anticipar "se registrará como Pago N". */
export function proximoNumeroDePago(ingresos: IngresoBase[]): number {
  return ingresos.filter((i) => normalizarTipoIngreso(i.tipo) === "PAGO").length + 1;
}
