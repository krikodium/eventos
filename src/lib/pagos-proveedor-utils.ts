export const ROL_COMPROMISO = "COMPROMISO";
export const ROL_MOVIMIENTO = "MOVIMIENTO";

type PagoConRol = { monto: number; rol?: string };

export function esMovimientoPago(p: PagoConRol): boolean {
  return (p.rol ?? ROL_MOVIMIENTO) === ROL_MOVIMIENTO;
}

export function totalMovimientosProveedor<T extends PagoConRol>(pagos: T[]): number {
  return pagos.filter(esMovimientoPago).reduce((s, p) => s + p.monto, 0);
}

export type EstadoCompromiso = "PENDIENTE" | "PARTE_PAGA" | "PAGADO";

export function estadoCompromiso(montoCompromiso: number, sumaPagos: number): EstadoCompromiso {
  const tol = 0.01;
  if (sumaPagos <= tol) return "PENDIENTE";
  if (sumaPagos >= montoCompromiso - tol) return "PAGADO";
  return "PARTE_PAGA";
}
