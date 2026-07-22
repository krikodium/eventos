import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function isPrismaTableError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const code = (err as { code?: string }).code;
  return code === "P2021" || code === "P2010";
}

async function ensureTable() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Presupuesto" (
        "id" TEXT NOT NULL,
        "empresa" TEXT,
        "cliente" TEXT NOT NULL,
        "evento" TEXT NOT NULL,
        "fecha" TIMESTAMP(3) NOT NULL,
        "validez" INTEGER NOT NULL DEFAULT 15,
        "presupuestoNro" TEXT,
        "formaPago" TEXT,
        "total" DOUBLE PRECISION NOT NULL,
        "items" JSONB NOT NULL,
        "estadoEvento" TEXT NOT NULL DEFAULT 'BORRADOR',
        "honorariosTipo" TEXT NOT NULL DEFAULT 'PORCENTAJE',
        "honorariosMonto" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "honorariosConcepto" TEXT NOT NULL DEFAULT 'Honorarios HC',
        "cargasSocialesPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "impuestosPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Presupuesto_pkey" PRIMARY KEY ("id")
      );
    `);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Presupuesto" ADD COLUMN IF NOT EXISTS "honorariosTipo" TEXT NOT NULL DEFAULT 'PORCENTAJE'`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Presupuesto" ADD COLUMN IF NOT EXISTS "honorariosMonto" DOUBLE PRECISION NOT NULL DEFAULT 0`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Presupuesto" ADD COLUMN IF NOT EXISTS "honorariosConcepto" TEXT NOT NULL DEFAULT 'Honorarios HC'`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Presupuesto" ADD COLUMN IF NOT EXISTS "cargasSocialesPct" DOUBLE PRECISION NOT NULL DEFAULT 0`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Presupuesto" ADD COLUMN IF NOT EXISTS "impuestosPct" DOUBLE PRECISION NOT NULL DEFAULT 0`);
  } catch {
    // tabla ya existe con todas las columnas
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.permisos) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const isAdmin = session.user.role === "ADMIN";
  if (!isAdmin && !session.user.permisos.navPresupuestos) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    await ensureTable();
    const presupuestos = await prisma.presupuesto.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(presupuestos);
  } catch (err: unknown) {
    console.error("GET /api/presupuestos error:", err);
    const msg = err instanceof Error ? err.message : "Error al obtener presupuestos";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    await ensureTable();
    const body = await req.json();
    const {
      empresa, cliente, evento, fecha, validez, presupuestoNro, formaPago,
      total, items, estadoEvento,
      honorariosTipo, honorariosMonto, honorariosConcepto,
      cargasSocialesPct, impuestosPct,
    } = body;

    if (!cliente || !evento || !fecha || !Array.isArray(items)) {
      return NextResponse.json(
        { error: "Campos requeridos: cliente, evento, fecha, items" },
        { status: 400 }
      );
    }

    const presupuesto = await prisma.presupuesto.create({
      data: {
        empresa: empresa || null,
        cliente,
        evento,
        fecha: new Date(fecha),
        validez: Number(validez) > 0 ? Number(validez) : 15,
        presupuestoNro: presupuestoNro || null,
        formaPago: formaPago || null,
        total: Number(total) || 0,
        items,
        estadoEvento: ["BORRADOR", "CONFIRMADO", "EN_CURSO"].includes(estadoEvento)
          ? estadoEvento
          : "BORRADOR",
        honorariosTipo: honorariosTipo === "FIJO" ? "FIJO" : "PORCENTAJE",
        honorariosMonto: Number(honorariosMonto) || 0,
        honorariosConcepto: honorariosConcepto || "Honorarios HC",
        cargasSocialesPct: Number(cargasSocialesPct) || 0,
        impuestosPct: Number(impuestosPct) || 0,
      },
    });

    return NextResponse.json(presupuesto);
  } catch (err: unknown) {
    console.error("POST /api/presupuestos error:", err);
    if (isPrismaTableError(err)) {
      return NextResponse.json(
        { error: "Error de tabla Presupuesto. Intentá reiniciar el servidor." },
        { status: 500 }
      );
    }
    const msg = err instanceof Error ? err.message : "Error al guardar presupuesto";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
