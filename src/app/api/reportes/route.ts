import { auth } from "@/lib/auth";
import { cajaSentidoEsEgreso } from "@/lib/caja-chica-pesos";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { idsPagosMovimientoEnRangoRaw } from "@/lib/pago-proveedor-raw";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");

  if (!desde || !hasta) {
    return NextResponse.json(
      { error: "Faltan parámetros: desde, hasta (YYYY-MM-DD)" },
      { status: 400 }
    );
  }

  const fechaDesde = new Date(desde);
  const fechaHasta = new Date(hasta);
  fechaHasta.setHours(23, 59, 59, 999);

  const idsMov = await idsPagosMovimientoEnRangoRaw(fechaDesde, fechaHasta);
  const pagos =
    idsMov && idsMov.length > 0
      ? await prisma.pagoProveedor.findMany({
          where: { id: { in: idsMov } },
          include: {
            proveedor: true,
            rubro: true,
            evento: true,
          },
        })
      : idsMov === null
        ? await prisma.pagoProveedor.findMany({
            where: {
              fecha: { gte: fechaDesde, lte: fechaHasta },
            },
            include: {
              proveedor: true,
              rubro: true,
              evento: true,
            },
          })
        : [];

  const cajaChica = await prisma.cajaChicaEvento.findMany({
    where: { fecha: { gte: fechaDesde, lte: fechaHasta } },
    include: { evento: true },
  });

  const diasUtileros = await prisma.diaUtilero.findMany({
    where: {
      OR: [
        { createdAt: { gte: fechaDesde, lte: fechaHasta } },
        {
          evento: {
            fecha: { gte: fechaDesde, lte: fechaHasta },
          },
        },
      ],
    },
    include: {
      utilero: true,
      evento: true,
    },
  });

  const ingresos = await prisma.ingreso.findMany({
    where: {
      fecha: { gte: fechaDesde, lte: fechaHasta },
    },
    include: { evento: true },
  });

  // Agrupar por rubro
  const porRubro: Record<string, { total: number; pagos: typeof pagos }> = {};
  for (const p of pagos) {
    const key = p.rubro.nombre;
    if (!porRubro[key]) porRubro[key] = { total: 0, pagos: [] };
    porRubro[key].total += p.monto;
    porRubro[key].pagos.push(p);
  }

  // Agrupar por proveedor
  const porProveedor: Record<string, { total: number; pagos: typeof pagos }> = {};
  for (const p of pagos) {
    const key = p.proveedor.nombre;
    if (!porProveedor[key]) porProveedor[key] = { total: 0, pagos: [] };
    porProveedor[key].total += p.monto;
    porProveedor[key].pagos.push(p);
  }

  const totalPagos = pagos.reduce((s, p) => s + p.monto, 0);
  const totalUtileros = diasUtileros.reduce((s, d) => s + d.monto, 0);
  const totalCajaChica = cajaChica.reduce(
    (s, c) => s + (cajaSentidoEsEgreso(c.sentido) ? c.monto : 0),
    0
  );
  const totalIngresos = ingresos.reduce((s, i) => s + i.monto, 0);

  const porEventoMap = new Map<
    string,
    {
      eventoId: string;
      nombre: string;
      cliente: string;
      fecha: string;
      ingresos: number;
      pagosProveedores: number;
      utileros: number;
      cajaChica: number;
      egresos: number;
      balance: number;
    }
  >();

  const ensureEvento = (
    eventoId: string,
    nombre: string,
    cliente: string,
    fecha: Date
  ) => {
    const existing = porEventoMap.get(eventoId);
    if (existing) return existing;
    const created = {
      eventoId,
      nombre,
      cliente,
      fecha: fecha.toISOString(),
      ingresos: 0,
      pagosProveedores: 0,
      utileros: 0,
      cajaChica: 0,
      egresos: 0,
      balance: 0,
    };
    porEventoMap.set(eventoId, created);
    return created;
  };

  for (const i of ingresos) {
    const e = ensureEvento(i.eventoId, i.evento.nombre, i.evento.cliente, i.evento.fecha);
    e.ingresos += i.monto;
  }
  for (const p of pagos) {
    const e = ensureEvento(p.eventoId, p.evento.nombre, p.evento.cliente, p.evento.fecha);
    e.pagosProveedores += p.monto;
  }
  for (const d of diasUtileros) {
    const e = ensureEvento(d.eventoId, d.evento.nombre, d.evento.cliente, d.evento.fecha);
    e.utileros += d.monto;
  }
  for (const c of cajaChica) {
    if (!cajaSentidoEsEgreso(c.sentido)) continue;
    const e = ensureEvento(c.eventoId, c.evento.nombre, c.evento.cliente, c.evento.fecha);
    e.cajaChica += c.monto;
  }

  const porEvento = Array.from(porEventoMap.values())
    .map((e) => {
      const egresos = e.pagosProveedores + e.utileros + e.cajaChica;
      return {
        ...e,
        egresos,
        balance: e.ingresos - egresos,
      };
    })
    .sort((a, b) => b.egresos - a.egresos);

  return NextResponse.json({
    desde,
    hasta,
    porRubro: Object.entries(porRubro).map(([nombre, data]) => ({
      rubro: nombre,
      total: data.total,
      cantidad: data.pagos.length,
    })),
    porProveedor: Object.entries(porProveedor).map(([nombre, data]) => ({
      proveedor: nombre,
      total: data.total,
      cantidad: data.pagos.length,
    })),
    totales: {
      pagosProveedores: totalPagos,
      utileros: totalUtileros,
      cajaChica: totalCajaChica,
      ingresos: totalIngresos,
      egresos: totalPagos + totalUtileros + totalCajaChica,
      balance: totalIngresos - totalPagos - totalUtileros - totalCajaChica,
    },
    porEvento,
    pagos,
    diasUtileros,
    ingresos,
  });
}
