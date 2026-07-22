import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { PRESET_OPERATIVO_EVENTOS } from "../src/lib/permisos";

const prisma = new PrismaClient();

/**
 * Parches idempotentes alineados con prisma/eventos-sync-schema.sql.
 * Si fallan, suele faltar ejecutar prisma/eventos-tables.sql en Neon primero.
 */
const EVENTOS_SCHEMA_PATCHES: string[] = [
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "eventosPermisos" JSONB`,
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
];

async function ensureEventosSchemaPatches() {
  for (const sql of EVENTOS_SCHEMA_PATCHES) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (e) {
      console.warn(
        "[seed] Parche de esquema omitido:",
        (e as Error).message?.slice(0, 120) ?? e
      );
    }
  }
}

async function main() {
  await ensureEventosSchemaPatches();

  // Usuario admin por defecto: admin@eventos.com / admin123
  const adminPassword = await hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@eventos.com" },
    update: { password: adminPassword, name: "Administrador", role: "ADMIN" },
    create: {
      email: "admin@eventos.com",
      password: adminPassword,
      name: "Administrador",
      role: "ADMIN",
    },
  });
  console.log("Admin creado:", admin.email);

  // Usuario empleado de prueba: empleado@eventos.com / empleado123
  const empPassword = await hash("empleado123", 12);
  const empleado = await prisma.user.upsert({
    where: { email: "empleado@eventos.com" },
    update: { password: empPassword, name: "Empleado Demo", role: "VENDEDOR" },
    create: {
      email: "empleado@eventos.com",
      password: empPassword,
      name: "Empleado Demo",
      role: "VENDEDOR",
    },
  });
  console.log("Empleado creado:", empleado.email);

  // Nicole — perfil operativo (email: nicole@eventos.hc / Nicole2026!Hc)
  const nicolePassword = await hash("Nicole2026!Hc", 12);
  const nicole = await prisma.user.upsert({
    where: { email: "nicole@eventos.hc" },
    update: {
      password: nicolePassword,
      name: "Nicole",
      role: "VENDEDOR",
      eventosPermisos: PRESET_OPERATIVO_EVENTOS as object,
    },
    create: {
      email: "nicole@eventos.hc",
      password: nicolePassword,
      name: "Nicole",
      role: "VENDEDOR",
      eventosPermisos: PRESET_OPERATIVO_EVENTOS as object,
    },
  });
  console.log("Nicole (operativa):", nicole.email);

  // Rubros, proveedores y utileros (solo si existen las tablas de Eventos)
  try {
    const rubros = await Promise.all([
      prisma.rubro.upsert({ where: { nombre: "Catering" }, update: {}, create: { nombre: "Catering" } }),
      prisma.rubro.upsert({ where: { nombre: "Música" }, update: {}, create: { nombre: "Música" } }),
      prisma.rubro.upsert({ where: { nombre: "Decoración" }, update: {}, create: { nombre: "Decoración" } }),
      prisma.rubro.upsert({ where: { nombre: "Iluminación" }, update: {}, create: { nombre: "Iluminación" } }),
      prisma.rubro.upsert({ where: { nombre: "Otros" }, update: {}, create: { nombre: "Otros" } }),
    ]);
    console.log("Rubros creados:", rubros.length);

    const catering = rubros.find((r) => r.nombre === "Catering")!;
    const musica = rubros.find((r) => r.nombre === "Música")!;
    const decoracion = rubros.find((r) => r.nombre === "Decoración")!;

    let proveedorCatering = await prisma.proveedorEvento.findFirst({ where: { nombre: "Catering Premium SA" } });
    if (!proveedorCatering) {
      proveedorCatering = await prisma.proveedorEvento.create({
        data: { nombre: "Catering Premium SA", rubroId: catering.id, contacto: "011-1234-5678" },
      });
    }
    let proveedorMusica = await prisma.proveedorEvento.findFirst({ where: { nombre: "DJ Events" } });
    if (!proveedorMusica) {
      proveedorMusica = await prisma.proveedorEvento.create({
        data: { nombre: "DJ Events", rubroId: musica.id, contacto: "011-9876-5432" },
      });
    }
    let proveedorDeco = await prisma.proveedorEvento.findFirst({ where: { nombre: "Florería y Deco" } });
    if (!proveedorDeco) {
      proveedorDeco = await prisma.proveedorEvento.create({
        data: { nombre: "Florería y Deco", rubroId: decoracion.id, contacto: "011-5555-1234" },
      });
    }
    console.log("Proveedores listos");

    let utilero1 = await prisma.utilero.findFirst({ where: { nombre: "Juan Pérez" } });
    if (!utilero1) {
      utilero1 = await prisma.utilero.create({ data: { nombre: "Juan Pérez", tarifaPorDia: 15000 } });
    }
    let utilero2 = await prisma.utilero.findFirst({ where: { nombre: "María García" } });
    if (!utilero2) {
      utilero2 = await prisma.utilero.create({ data: { nombre: "María García", tarifaPorDia: 15000 } });
    }
    console.log("Utileros listos");

    // 2 eventos con movimientos
    const eventosCount = await prisma.evento.count();
    if (eventosCount === 0) {
      const hoy = new Date();
      const en2Semanas = new Date(hoy);
      en2Semanas.setDate(en2Semanas.getDate() + 14);

      const evento1 = await prisma.evento.create({
        data: {
          nombre: "Casamiento López - Martínez",
          fecha: en2Semanas,
          tipo: "PARTICULAR",
          cliente: "Fam. López",
          estado: "CONFIRMADO",
          descripcion: "Casamiento en salón principal",
        },
      });
      const evento2 = await prisma.evento.create({
        data: {
          nombre: "Lanzamiento producto TechCorp",
          fecha: new Date(en2Semanas.getTime() + 7 * 24 * 60 * 60 * 1000),
          tipo: "CORPORATIVO",
          cliente: "TechCorp SA",
          estado: "BORRADOR",
          descripcion: "Evento corporativo con 150 invitados",
        },
      });

      // Evento 1: pagos, utileros, caja chica, ingresos
      await prisma.pagoProveedor.createMany({
        data: [
          { eventoId: evento1.id, proveedorId: proveedorCatering.id, rubroId: catering.id, monto: 450000, fecha: hoy },
          { eventoId: evento1.id, proveedorId: proveedorMusica.id, rubroId: musica.id, monto: 120000, fecha: hoy },
          { eventoId: evento1.id, proveedorId: proveedorDeco.id, rubroId: decoracion.id, monto: 85000, fecha: hoy, concepto: "Centros de mesa" },
        ],
      });
      await prisma.diaUtilero.createMany({
        data: [
          { eventoId: evento1.id, utileroId: utilero1.id, tipo: "ARMADO", dias: 0.5, monto: 7500 },
          { eventoId: evento1.id, utileroId: utilero1.id, tipo: "EVENTO", dias: 1, monto: 15000 },
          { eventoId: evento1.id, utileroId: utilero2.id, tipo: "EVENTO", dias: 1, monto: 15000 },
          { eventoId: evento1.id, utileroId: utilero2.id, tipo: "DESARME_EVENTO", dias: 0.5, monto: 7500 },
        ],
      });
      await prisma.cajaChicaEvento.createMany({
        data: [
          { eventoId: evento1.id, monto: 15000, empleadaEncargada: "María García", concepto: "Comida equipo armado" },
          { eventoId: evento1.id, monto: 5000, empleadaEncargada: "Juan Pérez", concepto: "Taxis" },
        ],
      });
      await prisma.ingreso.createMany({
        data: [
          { eventoId: evento1.id, monto: 200000, tipo: "ANTICIPO", fecha: hoy, concepto: "Anticipo 30%" },
          { eventoId: evento1.id, monto: 450000, tipo: "FACTURACION", fecha: hoy, numeroFactura: "F-001" },
        ],
      });

      // Evento 2: pagos, utileros, caja chica, ingresos
      await prisma.pagoProveedor.createMany({
        data: [
          { eventoId: evento2.id, proveedorId: proveedorCatering.id, rubroId: catering.id, monto: 320000, fecha: hoy, concepto: "Catering para 150 pax" },
          { eventoId: evento2.id, proveedorId: proveedorMusica.id, rubroId: musica.id, monto: 80000, fecha: hoy },
        ],
      });
      await prisma.diaUtilero.createMany({
        data: [
          { eventoId: evento2.id, utileroId: utilero1.id, tipo: "ARMADO", dias: 1, monto: 15000 },
          { eventoId: evento2.id, utileroId: utilero1.id, tipo: "GUARDIA", dias: 0.5, monto: 7500 },
          { eventoId: evento2.id, utileroId: utilero1.id, tipo: "EVENTO", dias: 1, monto: 15000 },
        ],
      });
      await prisma.cajaChicaEvento.create({
        data: {
          eventoId: evento2.id,
          monto: 25000,
          empleadaEncargada: "Juan Pérez",
          concepto: "Gastos varios equipo",
        },
      });
      await prisma.ingreso.createMany({
        data: [
          { eventoId: evento2.id, monto: 150000, tipo: "ANTICIPO", fecha: hoy, concepto: "Anticipo inicial" },
        ],
      });

      console.log("2 eventos con movimientos creados");
    }
  } catch {
    console.log(
      "Tablas de Eventos no creadas o incompletas. En Neon: prisma/eventos-tables.sql y prisma/eventos-sync-schema.sql"
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
