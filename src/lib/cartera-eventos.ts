import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { ROL_MOVIMIENTO } from "./pagos-proveedor-utils";
import { cajaSentidoEsEgreso } from "./caja-chica-pesos";

/**
 * Estado de cobranza de un evento, mirado desde el cliente:
 * cuánto se presupuestó, cuánto entró y cuánto falta entrar.
 */
export type EventoCartera = {
  id: string;
  nombre: string;
  cliente: string;
  organizadora: string | null;
  fecha: string;
  estado: string;
  tipo: string;
  /** Lo acordado con el cliente. 0 si el evento todavía no tiene presupuesto cargado. */
  presupuesto: number;
  /** Ingresos registrados (anticipos, pagos parciales, facturación). */
  cobrado: number;
  /** presupuesto - cobrado, nunca negativo. */
  porCobrar: number;
  /** % cobrado sobre presupuesto. null si no hay presupuesto cargado. */
  avance: number | null;
  /** Costos: proveedores (solo movimientos reales), utileros y caja chica. */
  egresos: number;
  proveedores: number;
  utileros: number;
  cajaChica: number;
  /** cobrado - egresos: plata real del evento hasta hoy. */
  resultado: number;
  /** Margen sobre lo presupuestado, null si no hay presupuesto. */
  margen: number | null;
};

function sumBy<T>(rows: T[], key: (row: T) => number): number {
  return rows.reduce((total, row) => total + key(row), 0);
}

/** Agrupa un conjunto de filas {eventoId, monto} en un mapa id -> total. */
function agrupar(rows: Array<{ eventoId: string; total: number }>): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) map.set(row.eventoId, (map.get(row.eventoId) ?? 0) + row.total);
  return map;
}

/**
 * Cartera completa de eventos con su situación de cobranza y costos.
 * Una consulta por tabla y el cruce en memoria: evita el N+1 de pedir
 * los totales evento por evento.
 */
export async function fetchCarteraEventos(): Promise<EventoCartera[]> {
  const [eventos, ingresos, utileros, cajaChica] = await Promise.all([
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
      },
    }),
    prisma.ingreso.groupBy({ by: ["eventoId"], _sum: { monto: true } }),
    prisma.diaUtilero.groupBy({ by: ["eventoId"], _sum: { monto: true } }),
    prisma.cajaChicaEvento.findMany({ select: { eventoId: true, monto: true, sentido: true } }),
  ]);

  // Los pagos a proveedores se filtran por `rol` en SQL: el compromiso es una
  // cotización, no plata que salió. Si la columna no existe todavía, cae a 0.
  let proveedoresRows: Array<{ eventoId: string; total: number }> = [];
  try {
    proveedoresRows = await prisma.$queryRaw<Array<{ eventoId: string; total: number }>>(
      Prisma.sql`
        SELECT "eventoId", COALESCE(SUM(monto), 0)::double precision AS total
        FROM "PagoProveedor"
        WHERE COALESCE("rol", ${ROL_MOVIMIENTO}) = ${ROL_MOVIMIENTO}
        GROUP BY "eventoId"
      `
    );
  } catch {
    proveedoresRows = [];
  }

  const mapIngresos = agrupar(
    ingresos.map((r) => ({ eventoId: r.eventoId, total: r._sum.monto ?? 0 }))
  );
  const mapUtileros = agrupar(
    utileros.map((r) => ({ eventoId: r.eventoId, total: r._sum.monto ?? 0 }))
  );
  const mapProveedores = agrupar(proveedoresRows);
  const mapCaja = agrupar(
    cajaChica
      .filter((c) => cajaSentidoEsEgreso(c.sentido))
      .map((c) => ({ eventoId: c.eventoId, total: c.monto }))
  );

  return eventos.map((evento) => {
    const presupuesto = evento.presupuestoTotal ?? 0;
    const cobrado = mapIngresos.get(evento.id) ?? 0;
    const proveedores = mapProveedores.get(evento.id) ?? 0;
    const utilerosTotal = mapUtileros.get(evento.id) ?? 0;
    const caja = mapCaja.get(evento.id) ?? 0;
    const egresos = proveedores + utilerosTotal + caja;

    return {
      id: evento.id,
      nombre: evento.nombre,
      cliente: evento.cliente,
      organizadora: evento.organizadora,
      fecha: evento.fecha.toISOString(),
      estado: evento.estado,
      tipo: evento.tipo,
      presupuesto,
      cobrado,
      porCobrar: Math.max(0, presupuesto - cobrado),
      avance: presupuesto > 0 ? Math.min(100, (cobrado / presupuesto) * 100) : null,
      egresos,
      proveedores,
      utileros: utilerosTotal,
      cajaChica: caja,
      resultado: cobrado - egresos,
      margen: presupuesto > 0 ? ((presupuesto - egresos) / presupuesto) * 100 : null,
    };
  });
}

/** Totales de un subconjunto de la cartera (se recalcula al filtrar). */
export function totalesCartera(eventos: EventoCartera[]) {
  const presupuesto = sumBy(eventos, (e) => e.presupuesto);
  const cobrado = sumBy(eventos, (e) => e.cobrado);
  const egresos = sumBy(eventos, (e) => e.egresos);
  return {
    eventos: eventos.length,
    presupuesto,
    cobrado,
    porCobrar: sumBy(eventos, (e) => e.porCobrar),
    egresos,
    resultado: cobrado - egresos,
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

/**
 * Filtra y ordena la cartera. Pura a propósito: la UI solo le pasa el estado
 * de los controles, y así el comportamiento se puede probar sin navegador.
 * `hoy` es inyectable para que las pruebas no dependan del día.
 */
export function filtrarCartera(
  eventos: EventoCartera[],
  filtros: FiltrosCartera,
  hoy: Date = new Date()
): EventoCartera[] {
  const q = filtros.busqueda.trim().toLocaleLowerCase("es");
  const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59);

  const lista = eventos.filter((e) => {
    if (q) {
      const campos = [e.nombre, e.cliente, e.organizadora ?? ""].join(" ").toLocaleLowerCase("es");
      if (!campos.includes(q)) return false;
    }
    if (filtros.estado !== "todos" && e.estado !== filtros.estado) return false;
    if (filtros.tipo !== "todos" && e.tipo !== filtros.tipo) return false;

    if (filtros.cobranza === "saldo" && !(e.presupuesto > 0 && e.porCobrar > 0)) return false;
    if (filtros.cobranza === "saldados" && !(e.presupuesto > 0 && e.porCobrar === 0)) return false;
    if (filtros.cobranza === "sin-presupuesto" && e.presupuesto > 0) return false;

    if (filtros.periodo !== "todos") {
      const f = new Date(e.fecha);
      if (filtros.periodo === "mes" && (f < inicioMes || f > finMes)) return false;
      if (filtros.periodo === "proximos" && f < inicioDia) return false;
      if (filtros.periodo === "pasados" && f >= inicioDia) return false;
    }
    return true;
  });

  return lista.sort((a, b) => {
    if (filtros.orden === "porCobrar") return b.porCobrar - a.porCobrar;
    if (filtros.orden === "avance") return (a.avance ?? 999) - (b.avance ?? 999);
    return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
  });
}
