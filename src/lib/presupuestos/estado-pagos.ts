import { aCanalPago, type CanalPago, type Moneda } from "./canal-pago";

/**
 * Estado de pago de lo presupuestado, contra lo efectivamente pagado.
 *
 * Adaptado del panel de pago de ítems de decodashboard. La pregunta que
 * contesta es una sola: **cuánto falta pagarle a cada proveedor**.
 *
 * Lo comprometido sale de las líneas del presupuesto (costo HC). Lo pagado sale
 * de los movimientos registrados en PagoProveedor. Se agrupa por proveedor
 * porque es la unidad en la que se gira la plata.
 */

export type EstadoPagoLinea = "PENDIENTE" | "PARCIAL" | "PAGADO";

export type LineaParaPago = {
  id: string;
  item: string;
  sectorNombre: string;
  sectorGrupoOpcion: string | null;
  sectorElegido: boolean;
  cantidad: number;
  costoUnitario: number;
  moneda: Moneda;
  canalPago: CanalPago | string;
  proveedorId: string | null;
  proveedorNombre: string | null;
  deshabilitado: boolean;
};

/** Movimiento real ya registrado contra un proveedor. */
export type PagoRegistrado = {
  proveedorId: string;
  monto: number;
  moneda: Moneda;
};

export type GrupoPago = {
  proveedorId: string | null;
  proveedorNombre: string;
  /** Comprometido por presupuesto, por moneda. */
  comprometido: Record<Moneda, number>;
  pagado: Record<Moneda, number>;
  pendiente: Record<Moneda, number>;
  /** % pagado sobre comprometido en ARS. null si no hay comprometido en ARS. */
  avance: number | null;
  estado: EstadoPagoLinea;
  canales: Record<CanalPago, number>;
  lineas: LineaParaPago[];
};

const TOLERANCIA = 0.01;

export function estadoDePago(comprometido: number, pagado: number): EstadoPagoLinea {
  if (pagado <= TOLERANCIA) return "PENDIENTE";
  if (pagado >= comprometido - TOLERANCIA) return "PAGADO";
  return "PARCIAL";
}

export const ESTADO_PAGO_LABEL: Record<EstadoPagoLinea, string> = {
  PENDIENTE: "Pendiente",
  PARCIAL: "Parcial",
  PAGADO: "Pagado",
};

/**
 * Agrupa las líneas por proveedor y cruza con lo pagado.
 *
 * Las líneas deshabilitadas y las de alternativas NO elegidas quedan afuera:
 * todavía no son plata a pagar, y contarlas inflaría lo pendiente.
 */
export function agruparPagosPorProveedor(
  lineas: LineaParaPago[],
  pagos: PagoRegistrado[]
): GrupoPago[] {
  const vigentes = lineas.filter(
    (l) => !l.deshabilitado && (l.sectorGrupoOpcion === null || l.sectorElegido)
  );

  const pagadoPorProveedor = new Map<string, Record<Moneda, number>>();
  for (const pago of pagos) {
    const actual = pagadoPorProveedor.get(pago.proveedorId) ?? { ARS: 0, USD: 0 };
    actual[pago.moneda] += pago.monto;
    pagadoPorProveedor.set(pago.proveedorId, actual);
  }

  const grupos = new Map<string, GrupoPago>();

  for (const linea of vigentes) {
    const clave = linea.proveedorId ?? "__sin_proveedor__";
    const grupo =
      grupos.get(clave) ??
      ({
        proveedorId: linea.proveedorId,
        proveedorNombre: linea.proveedorNombre ?? "Sin proveedor asignado",
        comprometido: { ARS: 0, USD: 0 },
        pagado: { ARS: 0, USD: 0 },
        pendiente: { ARS: 0, USD: 0 },
        avance: null,
        estado: "PENDIENTE",
        canales: { EFECTIVO: 0, TRANSFERENCIA: 0, A_DEFINIR: 0 },
        lineas: [],
      } satisfies GrupoPago);

    const costo = linea.cantidad * linea.costoUnitario;
    grupo.comprometido[linea.moneda] += costo;
    grupo.canales[aCanalPago(linea.canalPago)] += costo;
    grupo.lineas.push(linea);
    grupos.set(clave, grupo);
  }

  for (const grupo of grupos.values()) {
    if (grupo.proveedorId) {
      const pagado = pagadoPorProveedor.get(grupo.proveedorId) ?? { ARS: 0, USD: 0 };
      grupo.pagado = { ...pagado };
    }
    grupo.pendiente = {
      ARS: Math.max(0, grupo.comprometido.ARS - grupo.pagado.ARS),
      USD: Math.max(0, grupo.comprometido.USD - grupo.pagado.USD),
    };
    grupo.avance =
      grupo.comprometido.ARS > 0
        ? Math.min(100, (grupo.pagado.ARS / grupo.comprometido.ARS) * 100)
        : null;
    grupo.estado = estadoDePago(grupo.comprometido.ARS, grupo.pagado.ARS);
  }

  return [...grupos.values()].sort((a, b) => b.pendiente.ARS - a.pendiente.ARS);
}

/** Totales de la vista de pagos, para la cabecera. */
export function totalesPagos(grupos: GrupoPago[]) {
  const acc = {
    comprometido: 0,
    pagado: 0,
    pendiente: 0,
    proveedores: grupos.length,
    pendientes: 0,
  };
  for (const g of grupos) {
    acc.comprometido += g.comprometido.ARS;
    acc.pagado += g.pagado.ARS;
    acc.pendiente += g.pendiente.ARS;
    if (g.estado !== "PAGADO") acc.pendientes += 1;
  }
  return acc;
}
