import { aCanalPago, type CanalPago, type Moneda } from "./canal-pago";

/**
 * Cálculo de importes de un presupuesto, consciente de sectores con opciones.
 *
 * Adaptado de decodashboard. Es puro a propósito: el editor y el PDF tienen que
 * sumar exactamente igual, así que ambos llaman a estas funciones en vez de
 * recalcular cada uno por su lado.
 *
 * Regla de opciones: los sectores sin `grupoOpcion` son base y siempre suman.
 * Los sectores que comparten `grupoOpcion` son alternativas — NO se suman entre
 * sí. El "total con cada opción" es base + esa alternativa.
 */

export type Money = { ARS: number; USD: number };

export const cero = (): Money => ({ ARS: 0, USD: 0 });

export type LineaImporte = {
  cantidad: number;
  costoUnitario: number;
  precioUnitario: number;
  moneda: Moneda;
  canalPago: CanalPago | string;
  deshabilitado?: boolean;
};

export type SectorConLineas = {
  id: string;
  nombre: string;
  grupoOpcion: string | null;
  elegido?: boolean;
  lineas: LineaImporte[];
};

function num(valor: unknown): number {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

/** Importes de una línea: lo que cuesta a HC y lo que paga el cliente. */
export function importesLinea(linea: LineaImporte): { costo: number; cliente: number } {
  if (linea.deshabilitado) return { costo: 0, cliente: 0 };
  const cantidad = num(linea.cantidad);
  return {
    costo: cantidad * num(linea.costoUnitario),
    cliente: cantidad * num(linea.precioUnitario),
  };
}

export type TotalSector = {
  id: string;
  nombre: string;
  grupoOpcion: string | null;
  elegido: boolean;
  costo: Money;
  cliente: Money;
};

/** Totales por sector, separados por moneda. */
export function totalesPorSector(sectores: SectorConLineas[]): TotalSector[] {
  return sectores.map((sector) => {
    const costo = cero();
    const cliente = cero();
    for (const linea of sector.lineas) {
      const { costo: c, cliente: cl } = importesLinea(linea);
      costo[linea.moneda] += c;
      cliente[linea.moneda] += cl;
    }
    return {
      id: sector.id,
      nombre: sector.nombre,
      grupoOpcion: sector.grupoOpcion,
      elegido: sector.elegido ?? false,
      costo,
      cliente,
    };
  });
}

export type OpcionResumen = {
  nombre: string;
  elegido: boolean;
  monto: Money;
  /** base + esta opción: lo que pagaría el cliente si la elige. */
  totalConBase: Money;
};

export type GrupoOpciones = {
  grupo: string;
  opciones: OpcionResumen[];
};

export type ResumenPresupuesto = {
  /** Suma de los sectores base (parte fija). */
  base: Money;
  grupos: GrupoOpciones[];
  hayOpciones: boolean;
  /** Total plano: todos los sectores. Sirve cuando NO hay opciones. */
  totalPlano: Money;
  /** Base + la alternativa elegida de cada grupo. Es el total "real" vigente. */
  totalVigente: Money;
  hayUsd: boolean;
};

/**
 * Resumen del presupuesto para el cliente (precio de venta).
 * `totalVigente` es el número que hay que mirar: si el cliente ya eligió una
 * alternativa, la incluye; si no, solo la base.
 */
export function resumenPresupuesto(sectores: TotalSector[]): ResumenPresupuesto {
  const base = cero();
  const totalPlano = cero();
  const totalVigente = cero();

  for (const s of sectores) {
    totalPlano.ARS += s.cliente.ARS;
    totalPlano.USD += s.cliente.USD;
    if (!s.grupoOpcion) {
      base.ARS += s.cliente.ARS;
      base.USD += s.cliente.USD;
    }
  }

  totalVigente.ARS = base.ARS;
  totalVigente.USD = base.USD;

  const mapa = new Map<string, OpcionResumen[]>();
  for (const s of sectores) {
    if (!s.grupoOpcion) continue;
    const entrada: OpcionResumen = {
      nombre: s.nombre,
      elegido: s.elegido,
      monto: { ARS: s.cliente.ARS, USD: s.cliente.USD },
      totalConBase: { ARS: base.ARS + s.cliente.ARS, USD: base.USD + s.cliente.USD },
    };
    if (s.elegido) {
      totalVigente.ARS += s.cliente.ARS;
      totalVigente.USD += s.cliente.USD;
    }
    const arr = mapa.get(s.grupoOpcion) ?? [];
    arr.push(entrada);
    mapa.set(s.grupoOpcion, arr);
  }

  const grupos: GrupoOpciones[] = [...mapa.entries()].map(([grupo, opciones]) => ({
    grupo,
    opciones,
  }));

  return {
    base,
    grupos,
    hayOpciones: grupos.length > 0,
    totalPlano,
    totalVigente,
    hayUsd: totalPlano.USD > 0.0001 || base.USD > 0.0001,
  };
}

export type RepartoCanal = Record<CanalPago, Money>;

/**
 * Cómo se reparte el COSTO entre efectivo, transferencia y lo que queda por
 * definir. Es la plata que hay que juntar para pagarle a los proveedores.
 *
 * Los sectores que son alternativas no elegidas quedan afuera: todavía no son
 * plata a pagar.
 */
export function repartoPorCanal(sectores: SectorConLineas[]): RepartoCanal {
  const reparto: RepartoCanal = {
    EFECTIVO: cero(),
    TRANSFERENCIA: cero(),
    A_DEFINIR: cero(),
  };

  for (const sector of sectores) {
    const esAlternativaDescartada = sector.grupoOpcion !== null && !sector.elegido;
    if (esAlternativaDescartada) continue;

    for (const linea of sector.lineas) {
      const { costo } = importesLinea(linea);
      if (costo === 0) continue;
      reparto[aCanalPago(linea.canalPago)][linea.moneda] += costo;
    }
  }

  return reparto;
}

/** Margen del presupuesto: lo que cobra el cliente menos lo que cuesta. */
export function margenPresupuesto(sectores: TotalSector[]): {
  costo: Money;
  cliente: Money;
  margen: Money;
  margenPct: number | null;
} {
  const costo = cero();
  const cliente = cero();
  for (const s of sectores) {
    // Alternativas no elegidas no cuentan para el margen vigente.
    if (s.grupoOpcion !== null && !s.elegido) continue;
    costo.ARS += s.costo.ARS;
    costo.USD += s.costo.USD;
    cliente.ARS += s.cliente.ARS;
    cliente.USD += s.cliente.USD;
  }
  const margen: Money = { ARS: cliente.ARS - costo.ARS, USD: cliente.USD - costo.USD };
  // El % solo tiene sentido en una moneda; si hay USD se informa aparte.
  const margenPct = cliente.ARS > 0 ? (margen.ARS / cliente.ARS) * 100 : null;
  return { costo, cliente, margen, margenPct };
}
