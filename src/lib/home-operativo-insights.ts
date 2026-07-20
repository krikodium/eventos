import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ROL_COMPROMISO } from "@/lib/pagos-proveedor-utils";
import { CAJA_SENTIDO_EGRESO, CAJA_SENTIDO_INGRESO } from "@/lib/caja-chica-pesos";

export type ProximoEventoInsight = {
  id: string;
  nombre: string;
  cliente: string;
  fecha: Date;
  estado: string;
};

export type MovimientoCajaReciente = {
  id: string;
  monto: number;
  metodoPago: string;
  sentido: string;
  concepto: string | null;
  fecha: Date;
  eventoId: string;
  eventoNombre: string;
};

export type HomeOperativoInsights = {
  eventosTotal: number;
  eventosMes: number;
  eventosEnFoco: number;
  proximosEventos: ProximoEventoInsight[];
  compromisosPendientes: number;
  compromisosParciales: number;
  compromisosPagados: number;
  cajaMovimientosUltimos7Dias: number;
  tareasUtilerosProximas: number;
  ultimosMovimientosCaja: MovimientoCajaReciente[];
};

const empty: HomeOperativoInsights = {
  eventosTotal: 0,
  eventosMes: 0,
  eventosEnFoco: 0,
  proximosEventos: [],
  compromisosPendientes: 0,
  compromisosParciales: 0,
  compromisosPagados: 0,
  cajaMovimientosUltimos7Dias: 0,
  tareasUtilerosProximas: 0,
  ultimosMovimientosCaja: [],
};

export async function fetchHomeOperativoInsights(): Promise<HomeOperativoInsights> {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const hoy = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const limiteVentana = new Date(hoy);
    limiteVentana.setDate(limiteVentana.getDate() + 21);
    const hace7 = new Date(hoy);
    hace7.setDate(hace7.getDate() - 7);

    const [
      eventosTotal,
      eventosMes,
      eventosEnFoco,
      proximosEventos,
      compromisoRows,
      cajaMovimientosUltimos7Dias,
      tareasUtilerosProximas,
      ultimosMovimientosCaja,
    ] = await Promise.all([
      prisma.evento.count(),
      prisma.evento.count({
        where: { fecha: { gte: startOfMonth, lte: endOfMonth } },
      }),
      prisma.evento.count({
        where: { estado: { in: ["CONFIRMADO", "EN_CURSO"] } },
      }),
      prisma.evento.findMany({
        where: {
          fecha: { gte: hoy, lte: limiteVentana },
        },
        orderBy: { fecha: "asc" },
        take: 10,
        select: {
          id: true,
          nombre: true,
          cliente: true,
          fecha: true,
          estado: true,
        },
      }),
      prisma.$queryRaw<
        Array<{
          pendientes: bigint;
          parciales: bigint;
          pagados: bigint;
        }>
      >(Prisma.sql`
        SELECT
          COUNT(*) FILTER (WHERE t.pagado <= 0.01)::bigint AS pendientes,
          COUNT(*) FILTER (WHERE t.pagado > 0.01 AND t.pagado + 0.01 < t.monto)::bigint AS parciales,
          COUNT(*) FILTER (WHERE t.pagado + 0.01 >= t.monto)::bigint AS pagados
        FROM (
          SELECT
            p.monto AS monto,
            COALESCE((
              SELECT SUM(h.monto) FROM "PagoProveedor" h
              WHERE h."compromisoId" = p.id
            ), 0)::double precision AS pagado
          FROM "PagoProveedor" p
          WHERE COALESCE(p."rol", 'MOVIMIENTO') = ${ROL_COMPROMISO}
        ) t
      `).catch(() => []),
      prisma.cajaChicaEvento
        .count({
          where: { fecha: { gte: hace7 } },
        })
        .catch(() => 0),
      prisma.diaUtilero.count({
        where: {
          evento: {
            fecha: { gte: hoy, lte: limiteVentana },
          },
        },
      }),
      prisma.cajaChicaEvento
        .findMany({
          take: 8,
          orderBy: { fecha: "desc" },
          select: {
            id: true,
            monto: true,
            metodoPago: true,
            sentido: true,
            concepto: true,
            fecha: true,
            eventoId: true,
            evento: { select: { nombre: true } },
          },
        })
        .catch(() =>
          prisma.cajaChicaEvento.findMany({
            take: 8,
            orderBy: { fecha: "desc" },
            select: {
              id: true,
              monto: true,
              metodoPago: true,
              concepto: true,
              fecha: true,
              eventoId: true,
              evento: { select: { nombre: true } },
            },
          })
        ),
    ]);

    const cr = compromisoRows[0];
    const pend = Number(cr?.pendientes ?? 0);
    const parc = Number(cr?.parciales ?? 0);
    const pag = Number(cr?.pagados ?? 0);

    return {
      eventosTotal,
      eventosMes,
      eventosEnFoco,
      proximosEventos: proximosEventos.map((e) => ({
        id: e.id,
        nombre: e.nombre,
        cliente: e.cliente,
        fecha: e.fecha,
        estado: e.estado,
      })),
      compromisosPendientes: pend,
      compromisosParciales: parc,
      compromisosPagados: pag,
      cajaMovimientosUltimos7Dias,
      tareasUtilerosProximas: tareasUtilerosProximas,
      ultimosMovimientosCaja: ultimosMovimientosCaja.map((r) => {
        const sd = "sentido" in r && r.sentido === CAJA_SENTIDO_INGRESO ? CAJA_SENTIDO_INGRESO : CAJA_SENTIDO_EGRESO;
        return {
          id: r.id,
          monto: r.monto,
          metodoPago: r.metodoPago,
          sentido: sd,
          concepto: r.concepto,
          fecha: r.fecha,
          eventoId: r.eventoId,
          eventoNombre: r.evento.nombre,
        };
      }),
    };
  } catch {
    return { ...empty };
  }
}
