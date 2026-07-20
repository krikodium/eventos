-- Migración: Métodos de pago por divisa y tipo de cambio
-- Ejecutar contra la BD cuando corresponda.

-- Evento: tipo de cambio USD para pase a pesos
ALTER TABLE "Evento" ADD COLUMN IF NOT EXISTS "tipoCambioUsd" DOUBLE PRECISION;

-- PagoProveedor: metodoPago ya existe, actualizar valores legacy
-- TRANSFERENCIA -> TRANSF_ARS, EFECTIVO -> EFECTIVO_ARS, etc.
UPDATE "PagoProveedor" SET "metodoPago" = 'TRANSF_ARS' WHERE "metodoPago" = 'TRANSFERENCIA';
UPDATE "PagoProveedor" SET "metodoPago" = 'EFECTIVO_ARS' WHERE "metodoPago" = 'EFECTIVO';
UPDATE "PagoProveedor" SET "metodoPago" = 'TRANSF_ARS' WHERE "metodoPago" = 'CHEQUE';
UPDATE "PagoProveedor" SET "metodoPago" = 'TRANSF_ARS' WHERE "metodoPago" = 'OTRO';

-- CajaChicaEvento: agregar metodoPago
ALTER TABLE "CajaChicaEvento" ADD COLUMN IF NOT EXISTS "metodoPago" TEXT DEFAULT 'EFECTIVO_ARS';

-- Ingreso: agregar metodoPago
ALTER TABLE "Ingreso" ADD COLUMN IF NOT EXISTS "metodoPago" TEXT DEFAULT 'TRANSF_ARS';

-- UtileroEnEvento: metodoTransferencia y metodoEfectivo
ALTER TABLE "UtileroEnEvento" ADD COLUMN IF NOT EXISTS "metodoTransferencia" TEXT;
ALTER TABLE "UtileroEnEvento" ADD COLUMN IF NOT EXISTS "metodoEfectivo" TEXT;
