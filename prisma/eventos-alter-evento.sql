-- Agregar campos de detalles y cobros al evento
-- Ejecutar en Neon SQL Editor si la tabla Evento ya existe

ALTER TABLE "Evento" ADD COLUMN IF NOT EXISTS "organizadora" TEXT;
ALTER TABLE "Evento" ADD COLUMN IF NOT EXISTS "provincia" TEXT;
ALTER TABLE "Evento" ADD COLUMN IF NOT EXISTS "localidad" TEXT;
ALTER TABLE "Evento" ADD COLUMN IF NOT EXISTS "presupuestoTotal" DOUBLE PRECISION;
ALTER TABLE "Evento" ADD COLUMN IF NOT EXISTS "presupuestoNro" TEXT;
ALTER TABLE "Evento" ADD COLUMN IF NOT EXISTS "formaPagoAcordada" TEXT;
ALTER TABLE "Evento" ADD COLUMN IF NOT EXISTS "honorariosHC" DOUBLE PRECISION;
ALTER TABLE "Evento" ADD COLUMN IF NOT EXISTS "viaticosArmado" DOUBLE PRECISION;
