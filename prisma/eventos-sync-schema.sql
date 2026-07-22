-- =============================================================================
-- Alineación idempotente de PostgreSQL con prisma/schema.prisma (módulo Eventos)
-- =============================================================================
-- Cuándo usarlo:
--   - Errores Prisma P2022 ("column X does not exist")
--   - BD creada hace tiempo y faltan migraciones sueltas en prisma/
--
-- Requisito: las tablas base ya existen. Si es instalación nueva, ejecutá antes:
--   prisma/eventos-tables.sql
--
-- En Neon: pegar todo este archivo en SQL Editor y ejecutar una vez (es seguro
-- repetir: usa IF NOT EXISTS / IF NOT EXISTS columnas).
-- =============================================================================

-- --- User (compartida con Shop): permisos JSON del módulo Eventos ---
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "eventosPermisos" JSONB;

-- --- Evento: detalle comercial y caja ---
ALTER TABLE "Evento" ADD COLUMN IF NOT EXISTS "organizadora" TEXT;
ALTER TABLE "Evento" ADD COLUMN IF NOT EXISTS "provincia" TEXT;
ALTER TABLE "Evento" ADD COLUMN IF NOT EXISTS "localidad" TEXT;
ALTER TABLE "Evento" ADD COLUMN IF NOT EXISTS "presupuestoTotal" DOUBLE PRECISION;
ALTER TABLE "Evento" ADD COLUMN IF NOT EXISTS "presupuestoNro" TEXT;
ALTER TABLE "Evento" ADD COLUMN IF NOT EXISTS "formaPagoAcordada" TEXT;
ALTER TABLE "Evento" ADD COLUMN IF NOT EXISTS "honorariosHC" DOUBLE PRECISION;
ALTER TABLE "Evento" ADD COLUMN IF NOT EXISTS "viaticosArmado" DOUBLE PRECISION;
ALTER TABLE "Evento" ADD COLUMN IF NOT EXISTS "tipoCambioUsd" DOUBLE PRECISION;
ALTER TABLE "Evento" ADD COLUMN IF NOT EXISTS "diasArmado" INTEGER NOT NULL DEFAULT 2;
ALTER TABLE "Evento" ADD COLUMN IF NOT EXISTS "cajaChicaAsignadaArs" DOUBLE PRECISION;

-- --- Utilero: tarifas por tipo de tarea ---
ALTER TABLE "Utilero" ADD COLUMN IF NOT EXISTS "tarifaArmado" DOUBLE PRECISION;
ALTER TABLE "Utilero" ADD COLUMN IF NOT EXISTS "tarifaDesarmeEvento" DOUBLE PRECISION;
ALTER TABLE "Utilero" ADD COLUMN IF NOT EXISTS "tarifaDesarmeDepo" DOUBLE PRECISION;
ALTER TABLE "Utilero" ADD COLUMN IF NOT EXISTS "tarifaGuardia" DOUBLE PRECISION;

-- --- DiaUtilero: legacy desglose ---
ALTER TABLE "DiaUtilero" ADD COLUMN IF NOT EXISTS "montoTransferencia" DOUBLE PRECISION;
ALTER TABLE "DiaUtilero" ADD COLUMN IF NOT EXISTS "montoEfectivo" DOUBLE PRECISION;

-- --- UtileroEnEvento ---
CREATE TABLE IF NOT EXISTS "UtileroEnEvento" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "eventoId" TEXT NOT NULL REFERENCES "Evento"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "utileroId" TEXT NOT NULL REFERENCES "Utilero"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "anticipo" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "montoTransferencia" DOUBLE PRECISION,
  "montoEfectivo" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UtileroEnEvento_eventoId_utileroId_key" UNIQUE ("eventoId", "utileroId")
);
CREATE INDEX IF NOT EXISTS "UtileroEnEvento_eventoId_idx" ON "UtileroEnEvento"("eventoId");

ALTER TABLE "UtileroEnEvento" ADD COLUMN IF NOT EXISTS "metodoTransferencia" TEXT;
ALTER TABLE "UtileroEnEvento" ADD COLUMN IF NOT EXISTS "metodoEfectivo" TEXT;

-- --- CajaChicaEvento ---
ALTER TABLE "CajaChicaEvento" ADD COLUMN IF NOT EXISTS "metodoPago" TEXT DEFAULT 'EFECTIVO_ARS';
ALTER TABLE "CajaChicaEvento" ADD COLUMN IF NOT EXISTS "sentido" TEXT NOT NULL DEFAULT 'EGRESO';

-- --- Ingreso ---
ALTER TABLE "Ingreso" ADD COLUMN IF NOT EXISTS "metodoPago" TEXT DEFAULT 'TRANSF_ARS';

-- --- PagoProveedor: compromisos vs movimientos ---
ALTER TABLE "PagoProveedor" ADD COLUMN IF NOT EXISTS "rol" TEXT NOT NULL DEFAULT 'MOVIMIENTO';
ALTER TABLE "PagoProveedor" ADD COLUMN IF NOT EXISTS "compromisoId" TEXT;

CREATE INDEX IF NOT EXISTS "PagoProveedor_compromisoId_idx" ON "PagoProveedor"("compromisoId");

DO $$
BEGIN
  ALTER TABLE "PagoProveedor"
    ADD CONSTRAINT "PagoProveedor_compromisoId_fkey"
    FOREIGN KEY ("compromisoId") REFERENCES "PagoProveedor"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Valores legacy de metodoPago → códigos actuales
UPDATE "PagoProveedor" SET "metodoPago" = 'TRANSF_ARS' WHERE "metodoPago" = 'TRANSFERENCIA';
UPDATE "PagoProveedor" SET "metodoPago" = 'EFECTIVO_ARS' WHERE "metodoPago" = 'EFECTIVO';
UPDATE "PagoProveedor" SET "metodoPago" = 'TRANSF_ARS' WHERE "metodoPago" = 'CHEQUE';
UPDATE "PagoProveedor" SET "metodoPago" = 'TRANSF_ARS' WHERE "metodoPago" = 'OTRO';

-- --- Presupuesto ---
CREATE TABLE IF NOT EXISTS "Presupuesto" (
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
);

ALTER TABLE "Presupuesto" ADD COLUMN IF NOT EXISTS "honorariosTipo" TEXT NOT NULL DEFAULT 'PORCENTAJE';
ALTER TABLE "Presupuesto" ADD COLUMN IF NOT EXISTS "honorariosMonto" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Presupuesto" ADD COLUMN IF NOT EXISTS "honorariosConcepto" TEXT NOT NULL DEFAULT 'Honorarios HC';
ALTER TABLE "Presupuesto" ADD COLUMN IF NOT EXISTS "cargasSocialesPct" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Presupuesto" ADD COLUMN IF NOT EXISTS "impuestosPct" DOUBLE PRECISION NOT NULL DEFAULT 0;
