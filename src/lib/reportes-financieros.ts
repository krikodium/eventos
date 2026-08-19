import { sumarMovimientosEnArs } from "./cartera-eventos";

export type FilaMonedaReporte = {
  eventoId: string;
  monto: number;
  metodoPago: string;
  evento: { tipoCambioUsd: number | null; nombre: string };
};

export function convertirFilasMonedaReporte<T extends FilaMonedaReporte>(filas: T[]) {
  return filas.map((fila) => {
    const conversion = sumarMovimientosEnArs(
      [{ monto: fila.monto, metodoPago: fila.metodoPago }],
      fila.evento.tipoCambioUsd
    );
    return {
      ...fila,
      montoArs: conversion.totalArs,
      faltaTipoCambio: conversion.movimientosUsdSinTipoCambio > 0,
    };
  });
}

export function idsEventosSinTipoCambio(
  grupos: Array<Array<{ eventoId: string; faltaTipoCambio: boolean }>>
): Set<string> {
  return new Set(
    grupos
      .flat()
      .filter((fila) => fila.faltaTipoCambio)
      .map((fila) => fila.eventoId)
  );
}

export function filtrarEventosComparables<T extends { eventoId: string }>(
  filas: T[],
  eventosSinTipoCambio: Set<string>
): T[] {
  return filas.filter((fila) => !eventosSinTipoCambio.has(fila.eventoId));
}
