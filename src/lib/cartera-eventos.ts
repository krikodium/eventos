import { prisma } from "./prisma";
import { ROL_MOVIMIENTO } from "./pagos-proveedor-utils";
import { cajaSentidoEsEgreso } from "./caja-chica-pesos";
import { metodoPagoValido } from "./metodos-pago";

type EventoBaseCartera = {
  id: string;
  nombre: string;
  cliente: string;
  organizadora: string | null;
  fecha: Date;
  estado: string;
  tipo: string;
  presupuestoTotal: number | null;
  tipoCambioUsd: number | null;
};

type MovimientoCartera = { eventoId: string; monto: number; metodoPago: string | null };
type CostoUtileroCartera = { eventoId: string; total: number };
type MovimientoCajaCartera = MovimientoCartera & { sentido: string | null };

export type DatosCartera = {
  eventos: EventoBaseCartera[];
  ingresos: MovimientoCartera[];
  proveedores: MovimientoCartera[];
  utileros: CostoUtileroCartera[];
  cajaChica: MovimientoCajaCartera[];
};

/** Estado financiero de un evento expresado íntegramente en ARS. */
export type EventoCartera = {
  id: string;
  nombre: string;
  cliente: string;
  organizadora: string | null;
  fecha: string;
  estado: string;
  tipo: string;
  tipoCambioUsd: number | null;
  presupuesto: number;
  cobrado: number;
  /** null cuando hay movimientos USD que todavía no se pueden convertir. */
  porCobrar: number | null;
  avance: number | null;
  egresos: number;
  proveedores: number;
  utileros: number;
  cajaChica: number;
  /** null evita presentar un resultado parcial como definitivo. */
  resultado: number | null;
  margen: number | null;
  movimientosUsdSinTipoCambio: number;
};

export function etiquetaAvanceCartera(
  evento: Pick<EventoCartera, "avance" | "movimientosUsdSinTipoCambio">
): string {
  if (evento.movimientosUsdSinTipoCambio > 0) return "Falta TC";
  return evento.avance === null ? "Sin presupuesto" : `${evento.avance.toFixed(0)}%`;
}

function agruparPorEvento<T extends { eventoId: string }>(rows: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const grupo = map.get(row.eventoId) ?? [];
    grupo.push(row);
    map.set(row.eventoId, grupo);
  }
  return map;
}

function arsDesdeCentavos(centavos: number): number {
  return centavos / 100;
}

function centavosArs(monto: number): number {
  const centavos = Math.round(monto * 100);
  if (!Number.isFinite(centavos) || !Number.isSafeInteger(centavos)) {
    throw new Error("Monto fuera del rango seguro de centavos ARS");
  }
  return centavos;
}

function sumarCentavosSeguro(...valores: number[]): number {
  let total = 0;
  for (const valor of valores) {
    if (!Number.isSafeInteger(valor) || !Number.isSafeInteger(total + valor)) {
      throw new Error("Total fuera del rango seguro de centavos ARS");
    }
    total += valor;
  }
  return total;
}

/** Suma importes ya expresados en ARS preservando centavos y rango seguro. */
export function sumarImportesArsSeguro(importes: number[]): number {
  return arsDesdeCentavos(
    importes.reduce(
      (total, importe) => sumarCentavosSeguro(total, centavosArs(importe)),
      0
    )
  );
}

export function restarImportesArsSeguro(minuendo: number, sustraendo: number): number {
  return arsDesdeCentavos(
    sumarCentavosSeguro(centavosArs(minuendo), -centavosArs(sustraendo))
  );
}

/**
 * Convierte cada movimiento a centavos ARS antes de sumar. Un movimiento USD
 * sin cotización queda fuera del total y se informa para invalidar derivados.
 */
export function sumarMovimientosEnArs(
  movimientos: Array<{ monto: number; metodoPago: string | null | undefined }>,
  tipoCambioUsd: number | null | undefined
): { totalArs: number; movimientosUsdSinTipoCambio: number } {
  let totalCentavos = 0;
  let movimientosUsdSinTipoCambio = 0;
  const tcValido =
    typeof tipoCambioUsd === "number" && Number.isFinite(tipoCambioUsd) && tipoCambioUsd > 0;

  for (const movimiento of movimientos) {
    if (!metodoPagoValido(movimiento.metodoPago)) {
      throw new Error(`Método de pago inválido en cartera: ${String(movimiento.metodoPago)}`);
    }
    if (!Number.isFinite(movimiento.monto) || movimiento.monto <= 0) {
      throw new Error("Monto inválido en un movimiento de cartera");
    }
    const esUsd = movimiento.metodoPago.endsWith("_USD");
    if (esUsd && !tcValido) {
      movimientosUsdSinTipoCambio++;
      continue;
    }
    const montoArs = esUsd ? movimiento.monto * (tipoCambioUsd as number) : movimiento.monto;
    totalCentavos = sumarCentavosSeguro(totalCentavos, centavosArs(montoArs));
  }

  return { totalArs: arsDesdeCentavos(totalCentavos), movimientosUsdSinTipoCambio };
}

/** Arma la lectura en memoria; queda separada del acceso a BD para poder verificarla. */
export function construirCarteraEventos(datos: DatosCartera): EventoCartera[] {
  const ingresosPorEvento = agruparPorEvento(datos.ingresos);
  const proveedoresPorEvento = agruparPorEvento(datos.proveedores);
  const utilerosPorEvento = agruparPorEvento(datos.utileros);
  const cajaPorEvento = agruparPorEvento(datos.cajaChica);

  return datos.eventos.map((evento) => {
    const ingresos = sumarMovimientosEnArs(
      ingresosPorEvento.get(evento.id) ?? [],
      evento.tipoCambioUsd
    );
    const proveedores = sumarMovimientosEnArs(
      proveedoresPorEvento.get(evento.id) ?? [],
      evento.tipoCambioUsd
    );
    const caja = sumarMovimientosEnArs(
      (cajaPorEvento.get(evento.id) ?? []).filter((fila) => cajaSentidoEsEgreso(fila.sentido)),
      evento.tipoCambioUsd
    );
    const utilerosCentavos = (utilerosPorEvento.get(evento.id) ?? []).reduce(
      (total, fila) => sumarCentavosSeguro(total, centavosArs(fila.total)),
      0
    );

    const presupuesto = arsDesdeCentavos(centavosArs(evento.presupuestoTotal ?? 0));
    const utileros = arsDesdeCentavos(utilerosCentavos);
    const egresos = arsDesdeCentavos(
      sumarCentavosSeguro(
        centavosArs(proveedores.totalArs),
        centavosArs(utileros),
        centavosArs(caja.totalArs)
      )
    );
    const movimientosUsdSinTipoCambio =
      ingresos.movimientosUsdSinTipoCambio +
      proveedores.movimientosUsdSinTipoCambio +
      caja.movimientosUsdSinTipoCambio;
    const conversionCompleta = movimientosUsdSinTipoCambio === 0;
    const porCobrar = conversionCompleta
      ? Math.max(
          0,
          arsDesdeCentavos(
            sumarCentavosSeguro(centavosArs(presupuesto), -centavosArs(ingresos.totalArs))
          )
        )
      : null;

    return {
      id: evento.id,
      nombre: evento.nombre,
      cliente: evento.cliente,
      organizadora: evento.organizadora,
      fecha: evento.fecha.toISOString(),
      estado: evento.estado,
      tipo: evento.tipo,
      tipoCambioUsd: evento.tipoCambioUsd,
      presupuesto,
      cobrado: ingresos.totalArs,
      porCobrar,
      avance:
        conversionCompleta && presupuesto > 0
          ? Math.min(100, (ingresos.totalArs / presupuesto) * 100)
          : null,
      egresos,
      proveedores: proveedores.totalArs,
      utileros,
      cajaChica: caja.totalArs,
      resultado: conversionCompleta
        ? arsDesdeCentavos(
            sumarCentavosSeguro(centavosArs(ingresos.totalArs), -centavosArs(egresos))
          )
        : null,
      margen:
        conversionCompleta && presupuesto > 0
          ? ((presupuesto - egresos) / presupuesto) * 100
          : null,
      movimientosUsdSinTipoCambio,
    };
  });
}

/**
 * Cartera completa. Todas las consultas son compatibles con SQLite y los
 * errores se propagan: un fallo nunca se transforma silenciosamente en $0.
 */
async function cargarDatosCarteraDesdePrisma(): Promise<DatosCartera> {
  const [eventos, ingresos, proveedores, utileros, cajaChica] = await Promise.all([
    prisma.evento.findMany({
      orderBy: { fecha: "desc" },
      select: {
        id: true,
        nombre: true,
        cliente: true,
        organizadora: true,
        fecha: true,
        estado: true,
        tipo: true,
        presupuestoTotal: true,
        tipoCambioUsd: true,
      },
    }),
    prisma.ingreso.findMany({ select: { eventoId: true, monto: true, metodoPago: true } }),
    prisma.pagoProveedor.findMany({
      where: { rol: ROL_MOVIMIENTO },
      select: { eventoId: true, monto: true, metodoPago: true },
    }),
    prisma.diaUtilero.groupBy({ by: ["eventoId"], _sum: { monto: true } }),
    prisma.cajaChicaEvento.findMany({
      select: { eventoId: true, monto: true, metodoPago: true, sentido: true },
    }),
  ]);

  return {
    eventos,
    ingresos,
    proveedores,
    utileros: utileros.map((fila) => ({ eventoId: fila.eventoId, total: fila._sum.monto ?? 0 })),
    cajaChica,
  };
}

export async function fetchCarteraEventos(
  cargarDatos: () => Promise<DatosCartera> = cargarDatosCarteraDesdePrisma
): Promise<EventoCartera[]> {
  return construirCarteraEventos(await cargarDatos());
}

/** Totales comparables: excluye por completo eventos cuya conversión está pendiente. */
export function totalesCartera(eventos: EventoCartera[]) {
  const comparables = eventos.filter((evento) => evento.movimientosUsdSinTipoCambio === 0);
  const presupuestoCentavos = comparables.reduce(
    (total, evento) => sumarCentavosSeguro(total, centavosArs(evento.presupuesto)),
    0
  );
  const cobradoCentavos = comparables.reduce(
    (total, evento) => sumarCentavosSeguro(total, centavosArs(evento.cobrado)),
    0
  );
  const egresosCentavos = comparables.reduce(
    (total, evento) => sumarCentavosSeguro(total, centavosArs(evento.egresos)),
    0
  );
  const proveedoresCentavos = comparables.reduce(
    (total, evento) => sumarCentavosSeguro(total, centavosArs(evento.proveedores)),
    0
  );
  const utilerosCentavos = comparables.reduce(
    (total, evento) => sumarCentavosSeguro(total, centavosArs(evento.utileros)),
    0
  );
  const cajaChicaCentavos = comparables.reduce(
    (total, evento) => sumarCentavosSeguro(total, centavosArs(evento.cajaChica)),
    0
  );
  const presupuesto = arsDesdeCentavos(presupuestoCentavos);
  const cobrado = arsDesdeCentavos(cobradoCentavos);
  const egresos = arsDesdeCentavos(egresosCentavos);

  return {
    eventos: eventos.length,
    eventosComparables: comparables.length,
    eventosSinTipoCambio: eventos.length - comparables.length,
    presupuesto,
    cobrado,
    porCobrar: arsDesdeCentavos(
      comparables.reduce(
        (total, evento) => sumarCentavosSeguro(total, centavosArs(evento.porCobrar ?? 0)),
        0
      )
    ),
    egresos,
    proveedores: arsDesdeCentavos(proveedoresCentavos),
    utileros: arsDesdeCentavos(utilerosCentavos),
    cajaChica: arsDesdeCentavos(cajaChicaCentavos),
    resultado: arsDesdeCentavos(sumarCentavosSeguro(cobradoCentavos, -egresosCentavos)),
    avance: presupuesto > 0 ? Math.min(100, (cobrado / presupuesto) * 100) : null,
  };
}

export type FiltrosCartera = {
  busqueda: string;
  estado: string;
  tipo: string;
  cobranza: "todos" | "saldo" | "saldados" | "sin-presupuesto";
  periodo: "todos" | "mes" | "proximos" | "pasados";
  orden: "fecha" | "porCobrar" | "avance";
};

export function filtrarCartera(
  eventos: EventoCartera[],
  filtros: FiltrosCartera,
  hoy: Date = new Date()
): EventoCartera[] {
  const q = filtros.busqueda.trim().toLocaleLowerCase("es");
  const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59);

  const lista = eventos.filter((evento) => {
    if (q) {
      const campos = [evento.nombre, evento.cliente, evento.organizadora ?? ""]
        .join(" ")
        .toLocaleLowerCase("es");
      if (!campos.includes(q)) return false;
    }
    if (filtros.estado !== "todos" && evento.estado !== filtros.estado) return false;
    if (filtros.tipo !== "todos" && evento.tipo !== filtros.tipo) return false;

    if (
      filtros.cobranza === "saldo" &&
      !(evento.presupuesto > 0 && evento.porCobrar !== null && evento.porCobrar > 0)
    )
      return false;
    if (
      filtros.cobranza === "saldados" &&
      !(evento.presupuesto > 0 && evento.porCobrar === 0)
    )
      return false;
    if (filtros.cobranza === "sin-presupuesto" && evento.presupuesto > 0) return false;

    if (filtros.periodo !== "todos") {
      const fecha = new Date(evento.fecha);
      if (filtros.periodo === "mes" && (fecha < inicioMes || fecha > finMes)) return false;
      if (filtros.periodo === "proximos" && fecha < inicioDia) return false;
      if (filtros.periodo === "pasados" && fecha >= inicioDia) return false;
    }
    return true;
  });

  return lista.sort((a, b) => {
    if (filtros.orden === "porCobrar") return (b.porCobrar ?? -1) - (a.porCobrar ?? -1);
    if (filtros.orden === "avance") return (a.avance ?? 999) - (b.avance ?? 999);
    return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
  });
}
