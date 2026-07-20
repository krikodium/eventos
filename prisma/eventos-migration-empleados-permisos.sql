-- Módulo Eventos: permisos por usuario y compromisos vs movimientos de proveedor.
-- Ejecutar en el mismo PostgreSQL que usa DATABASE_URL (Neon).

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "eventosPermisos" JSONB;

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
