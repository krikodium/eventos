-- Acceso inicial y recuperación administrada sin correo.
-- Ejecutar antes de desplegar la versión que incorpora claves temporales.

BEGIN;

ALTER TABLE "EventosUsuario" ADD COLUMN IF NOT EXISTS "accesoTemporalHash" TEXT;
ALTER TABLE "EventosUsuario" ADD COLUMN IF NOT EXISTS "accesoTemporalExpiraAt" TIMESTAMP(3);
ALTER TABLE "EventosUsuario" ADD COLUMN IF NOT EXISTS "accesoTemporalIntentos" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "EventosUsuario" ADD COLUMN IF NOT EXISTS "accesoTemporalBloqueadoHasta" TIMESTAMP(3);
ALTER TABLE "EventosUsuario" ADD COLUMN IF NOT EXISTS "authVersion" INTEGER NOT NULL DEFAULT 0;

COMMIT;
