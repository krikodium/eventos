-- Migración: Pagos de utileros por tarea (no por día)
-- Ejecutar contra la BD cuando corresponda.
-- Si las columnas/tablas ya existen, ignorar los errores.

-- Utilero: tarifas por tipo de tarea
ALTER TABLE "Utilero" ADD COLUMN IF NOT EXISTS "tarifaArmado" DOUBLE PRECISION;
ALTER TABLE "Utilero" ADD COLUMN IF NOT EXISTS "tarifaDesarmeEvento" DOUBLE PRECISION;
ALTER TABLE "Utilero" ADD COLUMN IF NOT EXISTS "tarifaDesarmeDepo" DOUBLE PRECISION;
ALTER TABLE "Utilero" ADD COLUMN IF NOT EXISTS "tarifaGuardia" DOUBLE PRECISION;

-- DiaUtilero: desglose por medio de pago
ALTER TABLE "DiaUtilero" ADD COLUMN IF NOT EXISTS "montoTransferencia" DOUBLE PRECISION;
ALTER TABLE "DiaUtilero" ADD COLUMN IF NOT EXISTS "montoEfectivo" DOUBLE PRECISION;

-- Evento: días de armado (1 o 2)
ALTER TABLE "Evento" ADD COLUMN IF NOT EXISTS "diasArmado" INTEGER NOT NULL DEFAULT 2;

-- UtileroEnEvento: anticipo, transferencia y efectivo por utilero en cada evento
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
