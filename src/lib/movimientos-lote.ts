import { parseMontoPositivo, resolverMetodoPago } from "./metodos-pago";
import { esTipoIngresoValido } from "./ingresos";
import { CAJA_SENTIDO_EGRESO, CAJA_SENTIDO_INGRESO } from "./caja-chica-pesos";
import { ROL_MOVIMIENTO } from "./pagos-proveedor-utils";

/**
 * Validación de un lote de movimientos cargados de una sola vez.
 *
 * Se valida TODO el lote antes de escribir nada: si una fila está mal, no se
 * guarda ninguna. Es plata — media carga es peor que ninguna, porque deja al
 * usuario sin saber qué entró.
 */

export type TipoMovimiento = "INGRESO" | "PROVEEDOR" | "CAJA" | "UTILERO";

export type FilaLote = Record<string, unknown> & { tipo?: string };

export type MovimientoValidado =
  | {
      tipo: "INGRESO";
      monto: number;
      metodoPago: string;
      tipoIngreso: string;
      concepto: string | null;
      numeroFactura: string | null;
      fecha: Date;
    }
  | {
      tipo: "PROVEEDOR";
      monto: number;
      metodoPago: string;
      proveedorId: string;
      rubroId: string;
      concepto: string | null;
      fecha: Date;
    }
  | {
      tipo: "CAJA";
      monto: number;
      metodoPago: string;
      sentido: string;
      empleadaEncargada: string;
      concepto: string | null;
      fecha: Date;
    }
  | {
      tipo: "UTILERO";
      utileroId: string;
      tipoTarea: string;
      dias: number;
      monto: number;
    };

export type ResultadoLote =
  | { ok: true; movimientos: MovimientoValidado[] }
  | { ok: false; fila: number; error: string };

const TAREAS_VALIDAS = new Set([
  "ARMADO",
  "ARMADO_1",
  "ARMADO_2",
  "GUARDIA",
  "EVENTO",
  "DESARME_EVENTO",
  "DESARME_DEPO",
]);

function texto(valor: unknown): string | null {
  return typeof valor === "string" && valor.trim() ? valor.trim() : null;
}

function fechaValida(valor: unknown): Date | null {
  if (!valor) return new Date();
  if (typeof valor !== "string") return null;
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function validarLote(filas: unknown): ResultadoLote {
  if (!Array.isArray(filas) || filas.length === 0) {
    return { ok: false, fila: 0, error: "El lote no tiene movimientos" };
  }
  if (filas.length > 50) {
    return { ok: false, fila: 0, error: "Máximo 50 movimientos por lote" };
  }

  const movimientos: MovimientoValidado[] = [];

  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i] as FilaLote;
    const nro = i + 1;
    const tipo = fila.tipo;

    if (tipo === "UTILERO") {
      const utileroId = texto(fila.utileroId);
      if (!utileroId) return { ok: false, fila: nro, error: "Falta el utilero" };
      const tipoTarea = texto(fila.tipoTarea) ?? "EVENTO";
      if (!TAREAS_VALIDAS.has(tipoTarea)) {
        return { ok: false, fila: nro, error: "Tipo de tarea inválido" };
      }
      const monto = parseMontoPositivo(fila.monto);
      if (monto === null) {
        return { ok: false, fila: nro, error: "El monto debe ser mayor a cero" };
      }
      const dias = Number(fila.dias ?? 1);
      if (!Number.isFinite(dias) || dias <= 0) {
        return { ok: false, fila: nro, error: "Los días deben ser mayores a cero" };
      }
      movimientos.push({ tipo: "UTILERO", utileroId, tipoTarea, dias, monto });
      continue;
    }

    // Los tres restantes comparten monto, método y fecha.
    const monto = parseMontoPositivo(fila.monto);
    if (monto === null) {
      return { ok: false, fila: nro, error: "El monto debe ser mayor a cero" };
    }
    const metodoPago = resolverMetodoPago(fila.metodoPago, "TRANSF_ARS");
    if (metodoPago === null) {
      return { ok: false, fila: nro, error: "Método de pago inválido" };
    }
    const fecha = fechaValida(fila.fecha);
    if (fecha === null) return { ok: false, fila: nro, error: "Fecha inválida" };
    const concepto = texto(fila.concepto);

    if (tipo === "INGRESO") {
      const tipoIngreso = texto(fila.tipoIngreso) ?? "PAGO";
      if (!esTipoIngresoValido(tipoIngreso)) {
        return { ok: false, fila: nro, error: "Tipo de cobro inválido" };
      }
      movimientos.push({
        tipo: "INGRESO",
        monto,
        metodoPago,
        tipoIngreso,
        concepto,
        numeroFactura: texto(fila.numeroFactura),
        fecha,
      });
      continue;
    }

    if (tipo === "PROVEEDOR") {
      const proveedorId = texto(fila.proveedorId);
      const rubroId = texto(fila.rubroId);
      if (!proveedorId) return { ok: false, fila: nro, error: "Falta el proveedor" };
      if (!rubroId) return { ok: false, fila: nro, error: "Falta el rubro del proveedor" };
      movimientos.push({
        tipo: "PROVEEDOR",
        monto,
        metodoPago,
        proveedorId,
        rubroId,
        concepto,
        fecha,
      });
      continue;
    }

    if (tipo === "CAJA") {
      const empleadaEncargada = texto(fila.empleadaEncargada);
      if (!empleadaEncargada) {
        return { ok: false, fila: nro, error: "Falta quién carga el movimiento de caja" };
      }
      const sentido = fila.sentido === CAJA_SENTIDO_INGRESO ? CAJA_SENTIDO_INGRESO : CAJA_SENTIDO_EGRESO;
      movimientos.push({
        tipo: "CAJA",
        monto,
        metodoPago,
        sentido,
        empleadaEncargada,
        concepto,
        fecha,
      });
      continue;
    }

    return { ok: false, fila: nro, error: `Tipo de movimiento desconocido: ${String(tipo)}` };
  }

  return { ok: true, movimientos };
}

/** Rol con el que se graban los pagos a proveedor del lote: plata que salió. */
export const ROL_LOTE_PROVEEDOR = ROL_MOVIMIENTO;
