import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import {
  ROL_COMPROMISO,
  ROL_MOVIMIENTO,
  estadoCompromiso,
  type EstadoCompromiso,
} from "./pagos-proveedor-utils";

export type CompromisoResumenRow = {
  id: string;
  proveedorNombre: string;
  rubroNombre: string;
  montoTotal: number;
  estado: EstadoCompromiso;
  concepto: string | null;
  fecha: Date;
};

/** Compromisos del evento vía SQL (no requiere que el client de Prisma tenga el campo `rol` generado). */
export async function fetchCompromisosResumenForEventoRaw(
  eventoId: string
): Promise<CompromisoResumenRow[]> {
  try {
    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        monto: number;
        fecha: Date;
        concepto: string | null;
        proveedorNombre: string;
        rubroNombre: string;
        pagado: number;
      }>
    >(Prisma.sql`
      SELECT
        p.id,
        p.monto,
        p.fecha,
        p.concepto,
        prov.nombre AS "proveedorNombre",
        r.nombre AS "rubroNombre",
        COALESCE((
          SELECT SUM(h.monto) FROM "PagoProveedor" h
          WHERE h."compromisoId" = p.id
        ), 0)::double precision AS "pagado"
      FROM "PagoProveedor" p
      INNER JOIN "ProveedorEvento" prov ON p."proveedorId" = prov.id
      INNER JOIN "Rubro" r ON p."rubroId" = r.id
      WHERE p."eventoId" = ${eventoId} AND p."rol" = ${ROL_COMPROMISO}
    `);

    return rows.map((row) => ({
      id: row.id,
      proveedorNombre: row.proveedorNombre,
      rubroNombre: row.rubroNombre,
      montoTotal: row.monto,
      estado: estadoCompromiso(row.monto, row.pagado),
      concepto: row.concepto,
      fecha: row.fecha,
    }));
  } catch {
    return [];
  }
}

/** Suma solo movimientos (pagos reales), excluye filas COMPROMISO. `null` = falló el SQL (ej. columna `rol` inexistente). */
export async function sumMovimientosProveedorEventoRaw(eventoId: string): Promise<number | null> {
  try {
    const rows = await prisma.$queryRaw<[{ s: number | null }]>(
      Prisma.sql`
        SELECT COALESCE(SUM(monto), 0)::double precision AS s
        FROM "PagoProveedor"
        WHERE "eventoId" = ${eventoId}
          AND COALESCE("rol", ${ROL_MOVIMIENTO}) = ${ROL_MOVIMIENTO}
      `
    );
    return rows[0]?.s ?? 0;
  } catch {
    return null;
  }
}

/** Pagos a proveedores tipo movimiento para gráficos (misma forma que el include de Prisma). */
export async function fetchPagosMovimientoParaGraficoRaw(
  eventoId: string
): Promise<
  Array<{
    monto: number;
    concepto: string | null;
    proveedor: { nombre: string };
    rubro: { nombre: string };
  }>
> {
  try {
    const rows = await prisma.$queryRaw<
      Array<{ monto: number; concepto: string | null; prov: string; rubro: string }>
    >(Prisma.sql`
      SELECT
        p.monto,
        p.concepto,
        prov.nombre AS prov,
        r.nombre AS rubro
      FROM "PagoProveedor" p
      INNER JOIN "ProveedorEvento" prov ON p."proveedorId" = prov.id
      INNER JOIN "Rubro" r ON p."rubroId" = r.id
      WHERE p."eventoId" = ${eventoId}
        AND COALESCE(p."rol", ${ROL_MOVIMIENTO}) = ${ROL_MOVIMIENTO}
    `);
    return rows.map((row) => ({
      monto: row.monto,
      concepto: row.concepto,
      proveedor: { nombre: row.prov },
      rubro: { nombre: row.rubro },
    }));
  } catch {
    return [];
  }
}

/** Suma global de movimientos (excluye COMPROMISO). `null` si falla el SQL. */
export async function sumMovimientosProveedorGlobalRaw(): Promise<number | null> {
  try {
    const rows = await prisma.$queryRaw<[{ s: number | null }]>(
      Prisma.sql`
        SELECT COALESCE(SUM(monto), 0)::double precision AS s
        FROM "PagoProveedor"
        WHERE COALESCE("rol", ${ROL_MOVIMIENTO}) = ${ROL_MOVIMIENTO}
      `
    );
    return rows[0]?.s ?? 0;
  } catch {
    return null;
  }
}

export async function topProveedoresMovimientosRaw(
  take: number
): Promise<Array<{ proveedorId: string; total: number }>> {
  try {
    return await prisma.$queryRaw<Array<{ proveedorId: string; total: number }>>(
      Prisma.sql`
        SELECT "proveedorId", COALESCE(SUM(monto), 0)::double precision AS total
        FROM "PagoProveedor"
        WHERE COALESCE("rol", ${ROL_MOVIMIENTO}) = ${ROL_MOVIMIENTO}
        GROUP BY "proveedorId"
        ORDER BY total DESC
        LIMIT ${take}
      `
    );
  } catch {
    return [];
  }
}

/** IDs de pagos movimiento en rango de fechas; `null` si no se puede filtrar por `rol`. */
export async function idsPagosMovimientoEnRangoRaw(
  fechaDesde: Date,
  fechaHasta: Date
): Promise<string[] | null> {
  try {
    const rows = await prisma.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`
        SELECT id FROM "PagoProveedor"
        WHERE fecha >= ${fechaDesde}
          AND fecha <= ${fechaHasta}
          AND COALESCE("rol", ${ROL_MOVIMIENTO}) = ${ROL_MOVIMIENTO}
      `
    );
    return rows.map((r) => r.id);
  } catch {
    return null;
  }
}
