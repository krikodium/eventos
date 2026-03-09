import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const tipo = searchParams.get("tipo"); // rubro | proveedor

  if (!desde || !hasta) {
    return NextResponse.json(
      { error: "Faltan parámetros: desde, hasta (YYYY-MM-DD)" },
      { status: 400 }
    );
  }

  const fechaDesde = new Date(desde);
  const fechaHasta = new Date(hasta);
  fechaHasta.setHours(23, 59, 59, 999);

  const pagos = await prisma.pagoProveedor.findMany({
    where: {
      fecha: { gte: fechaDesde, lte: fechaHasta },
    },
    include: {
      proveedor: true,
      rubro: true,
      evento: true,
    },
  });

  const cajaChica = await prisma.cajaChica.findMany({
    where: { fecha: { gte: fechaDesde, lte: fechaHasta } },
  });

  const diasUtileros = await prisma.diaUtilero.findMany({
    where: {
      evento: {
        fecha: { gte: fechaDesde, lte: fechaHasta },
      },
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
  const totalCajaChica = cajaChica.reduce((s, c) => s + c.monto, 0);
  const totalIngresos = ingresos.reduce((s, i) => s + i.monto, 0);

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
    pagos,
    diasUtileros,
    ingresos,
  });
}
