-- Sectores y líneas de presupuesto (modelo tomado de decodashboard).
--
-- Reemplaza el `items` JSON plano por filas reales, para poder:
--   * agrupar por sector y armar alternativas (grupoOpcion),
--   * separar costo HC del precio al cliente,
--   * asignar proveedor y canal de pago por línea,
--   * seguir el estado de pago contra lo registrado en PagoProveedor.
--
-- Idempotente: se puede correr varias veces.

CREATE TABLE IF NOT EXISTS "PresupuestoSector" (
  "id"            TEXT NOT NULL,
  "presupuestoId" TEXT NOT NULL,
  "nombre"        TEXT NOT NULL,
  "orden"         INTEGER NOT NULL DEFAULT 0,
  "grupoOpcion"   TEXT,
  "elegido"       BOOLEAN NOT NULL DEFAULT false,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PresupuestoSector_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PresupuestoLinea" (
  "id"              TEXT NOT NULL,
  "presupuestoId"   TEXT NOT NULL,
  "sectorId"        TEXT NOT NULL,
  "orden"           INTEGER NOT NULL DEFAULT 0,
  "item"            TEXT NOT NULL,
  "descripcion"     TEXT,
  "cantidad"        DOUBLE PRECISION NOT NULL DEFAULT 1,
  "costoUnitario"   DOUBLE PRECISION NOT NULL DEFAULT 0,
  "precioUnitario"  DOUBLE PRECISION NOT NULL DEFAULT 0,
  "moneda"          TEXT NOT NULL DEFAULT 'ARS',
  "canalPago"       TEXT NOT NULL DEFAULT 'EFECTIVO',
  "proveedorId"     TEXT,
  "aprobadoCliente" BOOLEAN NOT NULL DEFAULT false,
  "deshabilitado"   BOOLEAN NOT NULL DEFAULT false,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PresupuestoLinea_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PresupuestoSector_presupuestoId_fkey') THEN
    ALTER TABLE "PresupuestoSector"
      ADD CONSTRAINT "PresupuestoSector_presupuestoId_fkey"
      FOREIGN KEY ("presupuestoId") REFERENCES "Presupuesto"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PresupuestoLinea_presupuestoId_fkey') THEN
    ALTER TABLE "PresupuestoLinea"
      ADD CONSTRAINT "PresupuestoLinea_presupuestoId_fkey"
      FOREIGN KEY ("presupuestoId") REFERENCES "Presupuesto"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PresupuestoLinea_sectorId_fkey') THEN
    ALTER TABLE "PresupuestoLinea"
      ADD CONSTRAINT "PresupuestoLinea_sectorId_fkey"
      FOREIGN KEY ("sectorId") REFERENCES "PresupuestoSector"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PresupuestoLinea_proveedorId_fkey') THEN
    ALTER TABLE "PresupuestoLinea"
      ADD CONSTRAINT "PresupuestoLinea_proveedorId_fkey"
      FOREIGN KEY ("proveedorId") REFERENCES "ProveedorEvento"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "PresupuestoSector_presupuestoId_idx" ON "PresupuestoSector"("presupuestoId");
CREATE INDEX IF NOT EXISTS "PresupuestoLinea_presupuestoId_idx" ON "PresupuestoLinea"("presupuestoId");
CREATE INDEX IF NOT EXISTS "PresupuestoLinea_sectorId_idx" ON "PresupuestoLinea"("sectorId");
CREATE INDEX IF NOT EXISTS "PresupuestoLinea_proveedorId_idx" ON "PresupuestoLinea"("proveedorId");
