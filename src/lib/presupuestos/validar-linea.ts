import { esCanalPagoValido, esMonedaValida } from "./canal-pago";

/**
 * Validación de una línea de presupuesto en el servidor.
 * La validación del formulario es UX; ésta es la que protege la base.
 */

export type LineaValidada = {
  item: string;
  descripcion: string | null;
  cantidad: number;
  costoUnitario: number;
  precioUnitario: number;
  moneda: "ARS" | "USD";
  canalPago: "EFECTIVO" | "TRANSFERENCIA" | "A_DEFINIR";
  proveedorId: string | null;
  aprobadoCliente: boolean;
  deshabilitado: boolean;
};

/** Importe monetario: finito, no negativo y con hasta dos decimales. */
export function parseImporte(valor: unknown): number | null {
  if (typeof valor === "number") {
    if (!Number.isFinite(valor) || valor < 0) return null;
    return Math.round(valor * 100) / 100;
  }
  if (typeof valor !== "string") return null;
  const limpio = valor.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(limpio)) return null;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
}

/** Cantidad: finita, mayor a cero, hasta dos decimales. */
export function parseCantidad(valor: unknown): number | null {
  const n = parseImporte(valor);
  if (n === null || n <= 0) return null;
  return n;
}

export type ResultadoValidacion =
  | { ok: true; linea: LineaValidada }
  | { ok: false; error: string };

export function validarLinea(body: Record<string, unknown>): ResultadoValidacion {
  const item = typeof body.item === "string" ? body.item.trim() : "";
  if (!item) return { ok: false, error: "La línea necesita un nombre de ítem" };

  const cantidad = parseCantidad(body.cantidad ?? 1);
  if (cantidad === null) {
    return { ok: false, error: "La cantidad debe ser mayor a cero (hasta 2 decimales)" };
  }

  const costoUnitario = parseImporte(body.costoUnitario ?? 0);
  if (costoUnitario === null) {
    return { ok: false, error: "El costo debe ser un importe válido (hasta 2 decimales)" };
  }

  const precioUnitario = parseImporte(body.precioUnitario ?? 0);
  if (precioUnitario === null) {
    return { ok: false, error: "El precio al cliente debe ser un importe válido" };
  }

  const moneda = body.moneda ?? "ARS";
  if (!esMonedaValida(moneda)) return { ok: false, error: "Moneda inválida" };

  const canalPago = body.canalPago ?? "EFECTIVO";
  if (!esCanalPagoValido(canalPago)) return { ok: false, error: "Canal de pago inválido" };

  return {
    ok: true,
    linea: {
      item,
      descripcion:
        typeof body.descripcion === "string" && body.descripcion.trim()
          ? body.descripcion.trim()
          : null,
      cantidad,
      costoUnitario,
      precioUnitario,
      moneda,
      canalPago,
      proveedorId:
        typeof body.proveedorId === "string" && body.proveedorId ? body.proveedorId : null,
      aprobadoCliente: body.aprobadoCliente === true,
      deshabilitado: body.deshabilitado === true,
    },
  };
}
