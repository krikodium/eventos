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
  const modo = searchParams.get("modo") === "historico" ? "historico" : "periodo";
  const alcance = searchParams.get("alcance");
  let desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");

  if (modo === "historico" && alcance === "todo" && hasta) {
    const [primerIngreso, primerPago, primeraCaja, primerEvento, primerDiaUtilero] =
      await Promise.all([
        prisma.ingreso.aggregate({ _min: { fecha: true } }),
        prisma.pagoProveedor.aggregate({ _min: { fecha: true } }),
        prisma.cajaChicaEvento.aggregate({ _min: { fecha: true } }),
        prisma.evento.aggregate({ _min: { fecha: true } }),
        prisma.diaUtilero.aggregate({ _min: { createdAt: true } }),
      ]);
    const fechas = [
      primerIngreso._min.fecha,
      primerPago._min.fecha,
      primeraCaja._min.fecha,
      primerEvento._min.fecha,
      primerDiaUtilero._min.createdAt,
    ].filter((fecha): fecha is Date => fecha instanceof Date);
    const primeraFecha = fechas.sort((a, b) => a.getTime() - b.getTime())[0];
    desde = (primeraFecha ?? new Date()).toISOString().slice(0, 10);
  }

  if (!desde || !hasta) {
    return NextResponse.json(
      { error: "Faltan parámetros: desde, hasta (YYYY-MM-DD)" },
      { status: 400 }
    );
  }

  const fechaDesde = new Date(`${desde}T00:00:00`);
  const fechaHasta = new Date(`${hasta}T23:59:59.999`);
  if (
    Number.isNaN(fechaDesde.getTime()) ||
    Number.isNaN(fechaHasta.getTime()) ||
    fechaDesde > fechaHasta
  ) {
    return NextResponse.json({ error: "El rango de fechas no es válido" }, { status: 400 });
  }

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

  type MesHistorico = {
    periodo: string;
    ingresos: number;
    pagosProveedores: number;
    utileros: number;
    cajaChica: number;
    eventos: Set<string>;
  };
  const historicoMap = new Map<string, MesHistorico>();
  const mesKey = (fecha: Date) =>
    `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
  const ensureMes = (fecha: Date) => {
    const periodo = mesKey(fecha);
    const current = historicoMap.get(periodo);
    if (current) return current;
    const created: MesHistorico = {
      periodo,
      ingresos: 0,
      pagosProveedores: 0,
      utileros: 0,
      cajaChica: 0,
      eventos: new Set<string>(),
    };
    historicoMap.set(periodo, created);
    return created;
  };

  for (const ingreso of ingresos) {
    const mes = ensureMes(ingreso.fecha);
    mes.ingresos += ingreso.monto;
    mes.eventos.add(ingreso.eventoId);
  }
  for (const pago of pagos) {
    const mes = ensureMes(pago.fecha);
    mes.pagosProveedores += pago.monto;
    mes.eventos.add(pago.eventoId);
  }
  for (const caja of cajaChica) {
    if (!cajaSentidoEsEgreso(caja.sentido)) continue;
    const mes = ensureMes(caja.fecha);
    mes.cajaChica += caja.monto;
    mes.eventos.add(caja.eventoId);
  }
  for (const dia of diasUtileros) {
    const fechaEvento = dia.evento.fecha;
    const fechaAtribucion =
      fechaEvento >= fechaDesde && fechaEvento <= fechaHasta ? fechaEvento : dia.createdAt;
    const mes = ensureMes(fechaAtribucion);
    mes.utileros += dia.monto;
    mes.eventos.add(dia.eventoId);
  }

  const cursor = new Date(fechaDesde.getFullYear(), fechaDesde.getMonth(), 1);
  const ultimoMes = new Date(fechaHasta.getFullYear(), fechaHasta.getMonth(), 1);
  while (cursor <= ultimoMes) {
    ensureMes(cursor);
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const historico = Array.from(historicoMap.values())
    .sort((a, b) => a.periodo.localeCompare(b.periodo))
    .map((mes) => {
      const egresos = mes.pagosProveedores + mes.utileros + mes.cajaChica;
      const balance = mes.ingresos - egresos;
      return {
        periodo: mes.periodo,
        ingresos: mes.ingresos,
        pagosProveedores: mes.pagosProveedores,
        utileros: mes.utileros,
        cajaChica: mes.cajaChica,
        egresos,
        balance,
        eventos: mes.eventos.size,
        margenPct: mes.ingresos > 0 ? (balance / mes.ingresos) * 100 : 0,
      };
    });

  return NextResponse.json({
    modo,
    desde,
    hasta,
    porRubro: Object.entries(porRubro)
      .map(([nombre, data]) => ({
        rubro: nombre,
        total: data.total,
        cantidad: data.pagos.length,
      }))
      .sort((a, b) => b.total - a.total),
    porProveedor: Object.entries(porProveedor)
      .map(([nombre, data]) => ({
        proveedor: nombre,
        total: data.total,
        cantidad: data.pagos.length,
      }))
      .sort((a, b) => b.total - a.total),
    totales: {
      pagosProveedores: totalPagos,
      utileros: totalUtileros,
      cajaChica: totalCajaChica,
      ingresos: totalIngresos,
      egresos: totalPagos + totalUtileros + totalCajaChica,
      balance: totalIngresos - totalPagos - totalUtileros - totalCajaChica,
    },
    porEvento,
    historico,
  });
}
