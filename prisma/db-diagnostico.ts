/**
 * Compara columnas reales en PostgreSQL con lo que espera schema.prisma.
 * Uso: npx tsx prisma/db-diagnostico.ts
 * Requiere DATABASE_URL en .env (raíz del proyecto).
 */
import "dotenv/config";
import { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/prisma";

const EXPECTED: Record<string, string[]> = {
  Evento: [
    "id",
    "nombre",
    "fecha",
    "fechaFin",
    "tipo",
    "cliente",
    "estado",
    "descripcion",
    "organizadora",
    "provincia",
    "localidad",
    "presupuestoTotal",
    "presupuestoNro",
    "formaPagoAcordada",
    "honorariosHC",
    "viaticosArmado",
    "diasArmado",
    "tipoCambioUsd",
    "cajaChicaAsignadaArs",
    "createdAt",
    "updatedAt",
  ],
  PagoProveedor: [
    "id",
    "eventoId",
    "proveedorId",
    "rubroId",
    "monto",
    "fecha",
    "concepto",
    "metodoPago",
    "createdAt",
    "rol",
    "compromisoId",
  ],
  CajaChicaEvento: ["id", "eventoId", "monto", "sentido", "metodoPago", "empleadaEncargada", "concepto", "fecha"],
  Ingreso: ["id", "eventoId", "monto", "metodoPago", "concepto", "fecha", "tipo", "numeroFactura", "createdAt"],
  Utilero: [
    "id",
    "nombre",
    "tarifaPorDia",
    "tarifaArmado",
    "tarifaDesarmeEvento",
    "tarifaDesarmeDepo",
    "tarifaGuardia",
    "createdAt",
    "updatedAt",
  ],
  DiaUtilero: [
    "id",
    "eventoId",
    "utileroId",
    "tipo",
    "dias",
    "monto",
    "montoTransferencia",
    "montoEfectivo",
    "createdAt",
  ],
  UtileroEnEvento: [
    "id",
    "eventoId",
    "utileroId",
    "anticipo",
    "montoTransferencia",
    "metodoTransferencia",
    "montoEfectivo",
    "metodoEfectivo",
    "createdAt",
  ],
  Presupuesto: [
    "id",
    "empresa",
    "cliente",
    "evento",
    "fecha",
    "validez",
    "presupuestoNro",
    "formaPago",
    "total",
    "items",
    "estadoEvento",
    "honorariosTipo",
    "honorariosMonto",
    "honorariosConcepto",
    "cargasSocialesPct",
    "impuestosPct",
    "createdAt",
    "updatedAt",
  ],
  User: [
    "id",
    "name",
    "email",
    "password",
    "emailVerified",
    "image",
    "role",
    "horarioEntrada",
    "horarioSalida",
    "diasTrabajo",
    "eventosPermisos",
    "createdAt",
    "updatedAt",
  ],
};

async function columnsInDb(tableName: string): Promise<string[]> {
  const rows = await prisma.$queryRaw<Array<{ column_name: string }>>(
    Prisma.sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ${tableName}
      ORDER BY ordinal_position
    `
  );
  return rows.map((r) => r.column_name);
}

async function tableExists(tableName: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ c: bigint }>>(
    Prisma.sql`
      SELECT COUNT(*)::bigint AS c
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${tableName}
    `
  );
  return Number(rows[0]?.c ?? 0) > 0;
}

/** Prisma usa "Evento"; algunas BD tienen evento en minúsculas. */
async function resolvePhysicalTable(canonical: string): Promise<string | null> {
  if (await tableExists(canonical)) return canonical;
  const lower = canonical.toLowerCase();
  if (lower !== canonical && (await tableExists(lower))) return lower;
  return null;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("Falta DATABASE_URL. Creá .env en la raíz con la URL de Neon.");
    process.exit(1);
  }

  console.log("Conectando…");
  await prisma.$connect();
  console.log("OK conexión.\n");

  for (const [table, expected] of Object.entries(EXPECTED)) {
    const physical = await resolvePhysicalTable(table);
    if (!physical) {
      console.log(`— Tabla "${table}": NO EXISTE en public (¿otro schema o nombre?).`);
      continue;
    }
    if (physical !== table) {
      console.log(`  (física: "${physical}")`);
    }
    const actual = new Set(await columnsInDb(physical));
    const missing = expected.filter((c) => !actual.has(c));
    const extra = [...actual].filter((c) => !expected.includes(c));

    if (missing.length === 0 && extra.length === 0) {
      console.log(`✓ "${table}": columnas alineadas con schema.prisma (${expected.length} campos).`);
    } else {
      console.log(`✗ "${table}": desalineada.`);
      if (missing.length) console.log("  Faltan en BD:", missing.join(", "));
      if (extra.length) console.log("  Extra en BD (no listadas en script):", extra.join(", "));
    }
  }

  console.log("\n--- Prueba Prisma evento.findMany (1 fila) ---");
  try {
    const one = await prisma.evento.findMany({ take: 1 });
    console.log("OK findMany:", one.length, "fila(s) leída(s).");
  } catch (e) {
    console.error("FALLO findMany:", e instanceof Error ? e.message : e);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
