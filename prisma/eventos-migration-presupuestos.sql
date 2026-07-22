-- Tabla de presupuestos guardados (independiente de Evento)
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

-- Agregar columnas nuevas si la tabla ya existía
ALTER TABLE "Presupuesto" ADD COLUMN IF NOT EXISTS "honorariosTipo" TEXT NOT NULL DEFAULT 'PORCENTAJE';
ALTER TABLE "Presupuesto" ADD COLUMN IF NOT EXISTS "honorariosMonto" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Presupuesto" ADD COLUMN IF NOT EXISTS "honorariosConcepto" TEXT NOT NULL DEFAULT 'Honorarios HC';
ALTER TABLE "Presupuesto" ADD COLUMN IF NOT EXISTS "cargasSocialesPct" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Presupuesto" ADD COLUMN IF NOT EXISTS "impuestosPct" DOUBLE PRECISION NOT NULL DEFAULT 0;
