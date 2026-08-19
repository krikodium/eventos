import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Parches idempotentes alineados con prisma/eventos-sync-schema.sql.
 * Si fallan, suele faltar ejecutar prisma/eventos-tables.sql en Neon primero.
 */
const EVENTOS_SCHEMA_PATCHES: string[] = [
  `ALTER TABLE "Evento" ADD COLUMN IF NOT EXISTS "organizadora" TEXT`,
  `ALTER TABLE "Evento" ADD COLUMN IF NOT EXISTS "provincia" TEXT`,
  `ALTER TABLE "Evento" ADD COLUMN IF NOT EXISTS "localidad" TEXT`,
  `ALTER TABLE "Evento" ADD COLUMN IF NOT EXISTS "presupuestoTotal" DOUBLE PRECISION`,
  `ALTER TABLE "Evento" ADD COLUMN IF NOT EXISTS "presupuestoNro" TEXT`,
  `ALTER TABLE "Evento" ADD COLUMN IF NOT EXISTS "formaPagoAcordada" TEXT`,
  `ALTER TABLE "Evento" ADD COLUMN IF NOT EXISTS "honorariosHC" DOUBLE PRECISION`,
  `ALTER TABLE "Evento" ADD COLUMN IF NOT EXISTS "viaticosArmado" DOUBLE PRECISION`,
  `ALTER TABLE "Evento" ADD COLUMN IF NOT EXISTS "tipoCambioUsd" DOUBLE PRECISION`,
  `ALTER TABLE "Evento" ADD COLUMN IF NOT EXISTS "diasArmado" INTEGER NOT NULL DEFAULT 2`,
  `ALTER TABLE "Evento" ADD COLUMN IF NOT EXISTS "cajaChicaAsignadaArs" DOUBLE PRECISION`,
  `ALTER TABLE "Utilero" ADD COLUMN IF NOT EXISTS "tarifaArmado" DOUBLE PRECISION`,
  `ALTER TABLE "Utilero" ADD COLUMN IF NOT EXISTS "tarifaDesarmeEvento" DOUBLE PRECISION`,
  `ALTER TABLE "Utilero" ADD COLUMN IF NOT EXISTS "tarifaDesarmeDepo" DOUBLE PRECISION`,
  `ALTER TABLE "Utilero" ADD COLUMN IF NOT EXISTS "tarifaGuardia" DOUBLE PRECISION`,
  `ALTER TABLE "DiaUtilero" ADD COLUMN IF NOT EXISTS "montoTransferencia" DOUBLE PRECISION`,
  `ALTER TABLE "DiaUtilero" ADD COLUMN IF NOT EXISTS "montoEfectivo" DOUBLE PRECISION`,
  `CREATE TABLE IF NOT EXISTS "UtileroEnEvento" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "eventoId" TEXT NOT NULL REFERENCES "Evento"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "utileroId" TEXT NOT NULL REFERENCES "Utilero"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "anticipo" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "montoTransferencia" DOUBLE PRECISION,
  "montoEfectivo" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UtileroEnEvento_eventoId_utileroId_key" UNIQUE ("eventoId", "utileroId")
)`,
  `CREATE INDEX IF NOT EXISTS "UtileroEnEvento_eventoId_idx" ON "UtileroEnEvento"("eventoId")`,
  `ALTER TABLE "UtileroEnEvento" ADD COLUMN IF NOT EXISTS "metodoTransferencia" TEXT`,
  `ALTER TABLE "UtileroEnEvento" ADD COLUMN IF NOT EXISTS "metodoEfectivo" TEXT`,
  `ALTER TABLE "CajaChicaEvento" ADD COLUMN IF NOT EXISTS "metodoPago" TEXT DEFAULT 'EFECTIVO_ARS'`,
  `ALTER TABLE "CajaChicaEvento" ADD COLUMN IF NOT EXISTS "sentido" TEXT NOT NULL DEFAULT 'EGRESO'`,
  `ALTER TABLE "Ingreso" ADD COLUMN IF NOT EXISTS "metodoPago" TEXT DEFAULT 'TRANSF_ARS'`,
  `ALTER TABLE "PagoProveedor" ADD COLUMN IF NOT EXISTS "rol" TEXT NOT NULL DEFAULT 'MOVIMIENTO'`,
  `ALTER TABLE "PagoProveedor" ADD COLUMN IF NOT EXISTS "compromisoId" TEXT`,
  `CREATE INDEX IF NOT EXISTS "PagoProveedor_compromisoId_idx" ON "PagoProveedor"("compromisoId")`,
  `DO $$
BEGIN
  ALTER TABLE "PagoProveedor"
    ADD CONSTRAINT "PagoProveedor_compromisoId_fkey"
    FOREIGN KEY ("compromisoId") REFERENCES "PagoProveedor"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$`,
  `UPDATE "PagoProveedor" SET "metodoPago" = 'TRANSF_ARS' WHERE "metodoPago" = 'TRANSFERENCIA'`,
  `UPDATE "PagoProveedor" SET "metodoPago" = 'EFECTIVO_ARS' WHERE "metodoPago" = 'EFECTIVO'`,
  `UPDATE "PagoProveedor" SET "metodoPago" = 'TRANSF_ARS' WHERE "metodoPago" = 'CHEQUE'`,
  `UPDATE "PagoProveedor" SET "metodoPago" = 'TRANSF_ARS' WHERE "metodoPago" = 'OTRO'`,
  `CREATE TABLE IF NOT EXISTS "Presupuesto" (
  "id" TEXT PRIMARY KEY,
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
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  `ALTER TABLE "Presupuesto" ADD COLUMN IF NOT EXISTS "honorariosTipo" TEXT NOT NULL DEFAULT 'PORCENTAJE'`,
  `ALTER TABLE "Presupuesto" ADD COLUMN IF NOT EXISTS "honorariosMonto" DOUBLE PRECISION NOT NULL DEFAULT 0`,
  `ALTER TABLE "Presupuesto" ADD COLUMN IF NOT EXISTS "honorariosConcepto" TEXT NOT NULL DEFAULT 'Honorarios HC'`,
  `ALTER TABLE "Presupuesto" ADD COLUMN IF NOT EXISTS "cargasSocialesPct" DOUBLE PRECISION NOT NULL DEFAULT 0`,
  `ALTER TABLE "Presupuesto" ADD COLUMN IF NOT EXISTS "impuestosPct" DOUBLE PRECISION NOT NULL DEFAULT 0`,
  `ALTER TABLE "Presupuesto" ADD COLUMN IF NOT EXISTS "eventoId" TEXT`,
  `CREATE INDEX IF NOT EXISTS "Presupuesto_eventoId_idx" ON "Presupuesto"("eventoId")`,
  `DO $$
BEGIN
  ALTER TABLE "Presupuesto"
    ADD CONSTRAINT "Presupuesto_eventoId_fkey"
    FOREIGN KEY ("eventoId") REFERENCES "Evento"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$`,
];

async function ensureEventosSchemaPatches() {
  for (const sql of EVENTOS_SCHEMA_PATCHES) {
    await prisma.$executeRawUnsafe(sql);
  }
}

const FECHA_BASE_DEMO = new Date("2026-08-18T15:00:00.000Z");

function fechaEnDias(dias: number): Date {
  const fecha = new Date(FECHA_BASE_DEMO);
  fecha.setDate(fecha.getDate() + dias);
  return fecha;
}

async function main() {
  const autorizado = process.argv.includes("--demo") || process.env.ALLOW_DEMO_SEED === "1";
  if (!autorizado) {
    throw new Error(
      "Seed demo bloqueado. Usá `npm run db:seed:demo` o definí ALLOW_DEMO_SEED=1 explícitamente."
    );
  }
  if (process.env.APPLY_LEGACY_SCHEMA_PATCHES === "1") {
    await ensureEventosSchemaPatches();
  }

  const resumen = await prisma.$transaction(async (tx) => {
    const rubros = await Promise.all(
      ["Catering", "Música", "Decoración", "Iluminación", "Logística", "Otros"].map(
        (nombre) => tx.rubro.upsert({ where: { nombre }, update: {}, create: { nombre } })
      )
    );
    const rubro = Object.fromEntries(rubros.map((item) => [item.nombre, item]));

    async function proveedor(
      id: string,
      nombre: string,
      rubroId: string,
      contacto: string
    ) {
      return tx.proveedorEvento.upsert({
        where: { id },
        update: { nombre, rubroId, contacto },
        create: { id, nombre, rubroId, contacto },
      });
    }

    const proveedores = {
      catering: await proveedor(
        "demo-proveedor-catering",
        "DEMO · Catering Premium",
        rubro.Catering.id,
        "11 5555-1001"
      ),
      musica: await proveedor(
        "demo-proveedor-musica",
        "DEMO · DJ Events",
        rubro["Música"].id,
        "11 5555-1002"
      ),
      decoracion: await proveedor(
        "demo-proveedor-decoracion",
        "DEMO · Florería y Deco",
        rubro["Decoración"].id,
        "11 5555-1003"
      ),
      iluminacion: await proveedor(
        "demo-proveedor-iluminacion",
        "DEMO · Luces del Sur",
        rubro["Iluminación"].id,
        "11 5555-1004"
      ),
      logistica: await proveedor(
        "demo-proveedor-logistica",
        "DEMO · Logística Integral BA",
        rubro["Logística"].id,
        "11 5555-1005"
      ),
    };

    async function utilero(id: string, nombre: string, tarifaPorDia: number) {
      const data = {
        nombre,
        tarifaPorDia,
        tarifaArmado: (tarifaPorDia * 75) / 100,
        tarifaDesarmeEvento: (tarifaPorDia * 50) / 100,
        tarifaDesarmeDepo: (tarifaPorDia * 50) / 100,
        tarifaGuardia: (tarifaPorDia * 65) / 100,
      };
      return tx.utilero.upsert({
        where: { id },
        update: data,
        create: {
          id,
          ...data,
        },
      });
    }

    const utileros = {
      juan: await utilero("demo-utilero-juan", "DEMO · Juan Pérez", 48_000),
      maria: await utilero("demo-utilero-maria", "DEMO · María García", 52_000),
      diego: await utilero("demo-utilero-diego", "DEMO · Diego Sosa", 46_000),
    };

    const eventos: Array<Prisma.EventoUncheckedCreateInput> = [
      {
        id: "demo-evento-casamiento",
        nombre: "Casamiento López · Martínez",
        fecha: fechaEnDias(14),
        fechaFin: fechaEnDias(15),
        tipo: "PARTICULAR",
        cliente: "Familias López y Martínez",
        estado: "CONFIRMADO",
        descripcion: "Casamiento para 220 invitados con ceremonia y fiesta.",
        organizadora: "Azares Eventos",
        provincia: "Buenos Aires",
        localidad: "Palermo",
        presupuestoTotal: 12_800_000,
        presupuestoNro: "DEMO-001",
        formaPagoAcordada: "40% anticipo, saldo 7 días antes",
        honorariosHC: 1_150_000,
        viaticosArmado: 180_000,
        diasArmado: 2,
        tipoCambioUsd: 1_250,
      },
      {
        id: "demo-evento-corporativo",
        nombre: "Lanzamiento Nova Tech",
        fecha: fechaEnDias(30),
        fechaFin: fechaEnDias(30),
        tipo: "CORPORATIVO",
        cliente: "Nova Tech Argentina",
        estado: "BORRADOR",
        descripcion: "Lanzamiento de producto y cóctel para prensa.",
        organizadora: "Graciela",
        provincia: "CABA",
        localidad: "Puerto Madero",
        presupuestoTotal: 18_500_000,
        presupuestoNro: "DEMO-002",
        formaPagoAcordada: "Tres pagos contra hitos",
        honorariosHC: 1_650_000,
        viaticosArmado: 240_000,
        diasArmado: 2,
        tipoCambioUsd: 1_275,
      },
      {
        id: "demo-evento-en-curso",
        nombre: "Convención comercial Andina",
        fecha: fechaEnDias(2),
        fechaFin: fechaEnDias(3),
        tipo: "CORPORATIVO",
        cliente: "Grupo Andina",
        estado: "EN_CURSO",
        descripcion: "Jornadas comerciales con escenario, streaming y catering.",
        organizadora: "Arturo",
        provincia: "Buenos Aires",
        localidad: "Pilar",
        presupuestoTotal: 9_600_000,
        presupuestoNro: "DEMO-003",
        formaPagoAcordada: "50% anticipo, 50% contra evento",
        honorariosHC: 850_000,
        viaticosArmado: 320_000,
        diasArmado: 2,
        tipoCambioUsd: 1_260,
      },
      {
        id: "demo-evento-facturado",
        nombre: "Cena anual Estudio Cúspide",
        fecha: fechaEnDias(-18),
        fechaFin: fechaEnDias(-18),
        tipo: "CORPORATIVO",
        cliente: "Estudio Cúspide",
        estado: "FACTURADO",
        descripcion: "Cena anual de cierre para clientes y equipo.",
        organizadora: "Graciela",
        provincia: "CABA",
        localidad: "Recoleta",
        presupuestoTotal: 7_400_000,
        presupuestoNro: "DEMO-004",
        formaPagoAcordada: "Pago total contra factura",
        honorariosHC: 680_000,
        viaticosArmado: 95_000,
        diasArmado: 1,
        tipoCambioUsd: 1_220,
      },
      {
        id: "demo-evento-finalizado",
        nombre: "Aniversario Fundación Horizonte",
        fecha: fechaEnDias(-48),
        fechaFin: fechaEnDias(-48),
        tipo: "CORPORATIVO",
        cliente: "Fundación Horizonte",
        estado: "FINALIZADO",
        descripcion: "Celebración institucional para donantes y autoridades.",
        organizadora: "Azares Eventos",
        provincia: "Buenos Aires",
        localidad: "San Isidro",
        presupuestoTotal: 6_200_000,
        presupuestoNro: "DEMO-005",
        formaPagoAcordada: "50% anticipo, saldo posterior",
        honorariosHC: 560_000,
        viaticosArmado: 120_000,
        diasArmado: 1,
        tipoCambioUsd: 1_180,
      },
      {
        id: "demo-evento-sin-tc",
        nombre: "Gala internacional · TC pendiente",
        fecha: fechaEnDias(45),
        fechaFin: fechaEnDias(45),
        tipo: "CORPORATIVO",
        cliente: "Global Partners",
        estado: "CONFIRMADO",
        descripcion: "Caso demostrativo con movimientos USD y tipo de cambio pendiente.",
        organizadora: "Mateo",
        provincia: "CABA",
        localidad: "Retiro",
        presupuestoTotal: 15_000_000,
        presupuestoNro: "DEMO-006",
        formaPagoAcordada: "Anticipo en USD",
        honorariosHC: 1_300_000,
        viaticosArmado: 150_000,
        diasArmado: 2,
        tipoCambioUsd: null,
      },
    ];

    for (const evento of eventos) {
      const { id, ...data } = evento;
      await tx.evento.upsert({ where: { id }, update: data, create: { id, ...data } });
    }

    const compromisos: Array<Prisma.PagoProveedorUncheckedCreateInput> = [
      {
        id: "demo-compromiso-casamiento-catering",
        eventoId: "demo-evento-casamiento",
        proveedorId: proveedores.catering.id,
        rubroId: rubro.Catering.id,
        monto: 3_600_000,
        fecha: fechaEnDias(-10),
        concepto: "Servicio gastronómico completo",
        metodoPago: "TRANSF_ARS",
        rol: "COMPROMISO",
      },
      {
        id: "demo-compromiso-corporativo-catering",
        eventoId: "demo-evento-corporativo",
        proveedorId: proveedores.catering.id,
        rubroId: rubro.Catering.id,
        monto: 4_800_000,
        fecha: fechaEnDias(-4),
        concepto: "Catering para lanzamiento",
        metodoPago: "TRANSF_ARS",
        rol: "COMPROMISO",
      },
    ];

    for (const pago of compromisos) {
      const { id, ...data } = pago;
      await tx.pagoProveedor.upsert({ where: { id }, update: data, create: { id, ...data } });
    }

    const pagos: Array<Prisma.PagoProveedorUncheckedCreateInput> = [
      {
        id: "demo-pago-casamiento-catering",
        eventoId: "demo-evento-casamiento",
        proveedorId: proveedores.catering.id,
        rubroId: rubro.Catering.id,
        monto: 1_800_000,
        fecha: fechaEnDias(-5),
        concepto: "Primer pago catering",
        metodoPago: "TRANSF_ARS",
        rol: "MOVIMIENTO",
        compromisoId: "demo-compromiso-casamiento-catering",
      },
      {
        id: "demo-pago-casamiento-dj-usd",
        eventoId: "demo-evento-casamiento",
        proveedorId: proveedores.musica.id,
        rubroId: rubro["Música"].id,
        monto: 900,
        fecha: fechaEnDias(-3),
        concepto: "DJ y sonido",
        metodoPago: "TRANSF_USD",
        rol: "MOVIMIENTO",
      },
      {
        id: "demo-pago-casamiento-deco",
        eventoId: "demo-evento-casamiento",
        proveedorId: proveedores.decoracion.id,
        rubroId: rubro["Decoración"].id,
        monto: 650_000,
        fecha: fechaEnDias(-2),
        concepto: "Seña ambientación floral",
        metodoPago: "TRANSF_ARS",
        rol: "MOVIMIENTO",
      },
      {
        id: "demo-pago-corporativo-catering",
        eventoId: "demo-evento-corporativo",
        proveedorId: proveedores.catering.id,
        rubroId: rubro.Catering.id,
        monto: 1_500_000,
        fecha: fechaEnDias(-1),
        concepto: "Reserva de fecha",
        metodoPago: "TRANSF_ARS",
        rol: "MOVIMIENTO",
        compromisoId: "demo-compromiso-corporativo-catering",
      },
      {
        id: "demo-pago-en-curso-luces",
        eventoId: "demo-evento-en-curso",
        proveedorId: proveedores.iluminacion.id,
        rubroId: rubro["Iluminación"].id,
        monto: 1_200,
        fecha: fechaEnDias(-6),
        concepto: "Iluminación y pantallas",
        metodoPago: "TRANSF_USD",
        rol: "MOVIMIENTO",
      },
      {
        id: "demo-pago-en-curso-logistica",
        eventoId: "demo-evento-en-curso",
        proveedorId: proveedores.logistica.id,
        rubroId: rubro["Logística"].id,
        monto: 780_000,
        fecha: fechaEnDias(-2),
        concepto: "Traslados y depósito",
        metodoPago: "TRANSF_ARS",
        rol: "MOVIMIENTO",
      },
      {
        id: "demo-pago-facturado-catering",
        eventoId: "demo-evento-facturado",
        proveedorId: proveedores.catering.id,
        rubroId: rubro.Catering.id,
        monto: 2_450_000,
        fecha: fechaEnDias(-25),
        concepto: "Catering cena anual",
        metodoPago: "TRANSF_ARS",
        rol: "MOVIMIENTO",
      },
      {
        id: "demo-pago-finalizado-deco",
        eventoId: "demo-evento-finalizado",
        proveedorId: proveedores.decoracion.id,
        rubroId: rubro["Decoración"].id,
        monto: 980_000,
        fecha: fechaEnDias(-55),
        concepto: "Ambientación institucional",
        metodoPago: "TRANSF_ARS",
        rol: "MOVIMIENTO",
      },
      {
        id: "demo-pago-sin-tc-usd",
        eventoId: "demo-evento-sin-tc",
        proveedorId: proveedores.iluminacion.id,
        rubroId: rubro["Iluminación"].id,
        monto: 2_100,
        fecha: fechaEnDias(0),
        concepto: "Seña técnica en USD pendiente de TC",
        metodoPago: "TRANSF_USD",
        rol: "MOVIMIENTO",
      },
    ];

    for (const pago of pagos) {
      const { id, ...data } = pago;
      await tx.pagoProveedor.upsert({ where: { id }, update: data, create: { id, ...data } });
    }

    const ingresos: Array<Prisma.IngresoUncheckedCreateInput> = [
      { id: "demo-ingreso-casamiento-ars", eventoId: "demo-evento-casamiento", monto: 3_800_000, metodoPago: "TRANSF_ARS", concepto: "Anticipo", fecha: fechaEnDias(-12), tipo: "ANTICIPO" },
      { id: "demo-ingreso-casamiento-usd", eventoId: "demo-evento-casamiento", monto: 2_000, metodoPago: "TRANSF_USD", concepto: "Segundo pago en USD", fecha: fechaEnDias(-4), tipo: "PAGO_PARCIAL" },
      { id: "demo-ingreso-corporativo", eventoId: "demo-evento-corporativo", monto: 4_500_000, metodoPago: "TRANSF_ARS", concepto: "Anticipo inicial", fecha: fechaEnDias(-5), tipo: "ANTICIPO" },
      { id: "demo-ingreso-en-curso", eventoId: "demo-evento-en-curso", monto: 7_000_000, metodoPago: "TRANSF_ARS", concepto: "Anticipo y segundo hito", fecha: fechaEnDias(-9), tipo: "PAGO_PARCIAL" },
      { id: "demo-ingreso-facturado", eventoId: "demo-evento-facturado", monto: 7_400_000, metodoPago: "TRANSF_ARS", concepto: "Factura cancelada", fecha: fechaEnDias(-16), tipo: "FACTURACION", numeroFactura: "DEMO-F-004" },
      { id: "demo-ingreso-finalizado", eventoId: "demo-evento-finalizado", monto: 5_200_000, metodoPago: "TRANSF_ARS", concepto: "Cobros acumulados", fecha: fechaEnDias(-46), tipo: "PAGO_PARCIAL" },
      { id: "demo-ingreso-sin-tc", eventoId: "demo-evento-sin-tc", monto: 3_000, metodoPago: "TRANSF_USD", concepto: "Anticipo USD pendiente de TC", fecha: fechaEnDias(0), tipo: "ANTICIPO" },
    ];

    for (const ingreso of ingresos) {
      const { id, ...data } = ingreso;
      await tx.ingreso.upsert({ where: { id }, update: data, create: { id, ...data } });
    }

    const cajas: Array<Prisma.CajaChicaEventoUncheckedCreateInput> = [
      { id: "demo-caja-casamiento-ingreso", eventoId: "demo-evento-casamiento", monto: 250_000, sentido: "INGRESO", metodoPago: "EFECTIVO_ARS", empleadaEncargada: "Graciela", concepto: "Fondo inicial", fecha: fechaEnDias(-2) },
      { id: "demo-caja-casamiento-egreso", eventoId: "demo-evento-casamiento", monto: 86_500, sentido: "EGRESO", metodoPago: "EFECTIVO_ARS", empleadaEncargada: "Graciela", concepto: "Comidas y traslados", fecha: fechaEnDias(-1) },
      { id: "demo-caja-corporativo-egreso", eventoId: "demo-evento-corporativo", monto: 120, sentido: "EGRESO", metodoPago: "EFECTIVO_USD", empleadaEncargada: "Arturo", concepto: "Muestra importada", fecha: fechaEnDias(0) },
      { id: "demo-caja-en-curso-egreso", eventoId: "demo-evento-en-curso", monto: 145_000, sentido: "EGRESO", metodoPago: "EFECTIVO_ARS", empleadaEncargada: "Arturo", concepto: "Viandas de montaje", fecha: fechaEnDias(0) },
      { id: "demo-caja-facturado-egreso", eventoId: "demo-evento-facturado", monto: 92_000, sentido: "EGRESO", metodoPago: "EFECTIVO_ARS", empleadaEncargada: "Graciela", concepto: "Movilidad y estacionamiento", fecha: fechaEnDias(-18) },
    ];

    for (const caja of cajas) {
      const { id, ...data } = caja;
      await tx.cajaChicaEvento.upsert({ where: { id }, update: data, create: { id, ...data } });
    }

    const tareas = [
      ["demo-evento-casamiento", utileros.juan.id, "ARMADO_1", 1, 36_000],
      ["demo-evento-casamiento", utileros.maria.id, "EVENTO", 1, 52_000],
      ["demo-evento-casamiento", utileros.diego.id, "DESARME_EVENTO", 1, 23_000],
      ["demo-evento-corporativo", utileros.juan.id, "ARMADO_1", 1, 36_000],
      ["demo-evento-corporativo", utileros.maria.id, "GUARDIA", 1, 33_800],
      ["demo-evento-en-curso", utileros.diego.id, "EVENTO", 2, 92_000],
      ["demo-evento-facturado", utileros.maria.id, "EVENTO", 1, 52_000],
      ["demo-evento-finalizado", utileros.juan.id, "EVENTO", 1, 48_000],
    ] as const;

    for (const [eventoId, utileroId, tipo, dias, monto] of tareas) {
      await tx.diaUtilero.upsert({
        where: { eventoId_utileroId_tipo: { eventoId, utileroId, tipo } },
        update: { dias, monto },
        create: { eventoId, utileroId, tipo, dias, monto },
      });
    }

    const asignaciones = [
      ["demo-asignacion-casamiento-juan", "demo-evento-casamiento", utileros.juan.id, 20_000],
      ["demo-asignacion-casamiento-maria", "demo-evento-casamiento", utileros.maria.id, 25_000],
      ["demo-asignacion-corporativo-diego", "demo-evento-corporativo", utileros.diego.id, 0],
      ["demo-asignacion-en-curso-diego", "demo-evento-en-curso", utileros.diego.id, 30_000],
    ] as const;

    for (const [id, eventoId, utileroId, anticipo] of asignaciones) {
      await tx.utileroEnEvento.upsert({
        where: { id },
        update: { eventoId, utileroId, anticipo, montoTransferencia: anticipo, metodoTransferencia: "TRANSF_ARS" },
        create: { id, eventoId, utileroId, anticipo, montoTransferencia: anticipo, metodoTransferencia: "TRANSF_ARS" },
      });
    }

    const presupuestos = eventos.slice(0, 5).map((evento, index) => ({
      id: `demo-presupuesto-${index + 1}`,
      eventoId: evento.id,
      empresa: "Hermanas Caradonti",
      cliente: evento.cliente,
      evento: evento.nombre,
      fecha: evento.fecha,
      validez: 15,
      presupuestoNro: evento.presupuestoNro,
      formaPago: evento.formaPagoAcordada,
      total: evento.presupuestoTotal ?? 0,
      items: [
        { concepto: "Producción integral", cantidad: 1, precio: (evento.presupuestoTotal ?? 0) * 0.55 },
        { concepto: "Proveedores y logística", cantidad: 1, precio: (evento.presupuestoTotal ?? 0) * 0.35 },
        { concepto: "Honorarios", cantidad: 1, precio: (evento.presupuestoTotal ?? 0) * 0.1 },
      ] as Prisma.InputJsonValue,
      estadoEvento: evento.estado,
      honorariosTipo: "MONTO",
      honorariosMonto: evento.honorariosHC ?? 0,
      honorariosConcepto: "Honorarios HC",
      cargasSocialesPct: 0,
      impuestosPct: 21,
    }));

    for (const presupuesto of presupuestos) {
      const { id, ...data } = presupuesto;
      await tx.presupuesto.upsert({ where: { id }, update: data, create: { id, ...data } });
    }

    return {
      eventos: eventos.length,
      proveedores: Object.keys(proveedores).length,
      utileros: Object.keys(utileros).length,
      compromisos: compromisos.length,
      pagos: pagos.length,
      ingresos: ingresos.length,
      caja: cajas.length,
      tareas: tareas.length,
      presupuestos: presupuestos.length,
    };
  }, { maxWait: 15_000, timeout: 60_000 });

  console.log("Seed de ejemplo aplicado:", resumen);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
