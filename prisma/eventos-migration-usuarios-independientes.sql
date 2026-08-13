-- Aísla la autenticación de Eventos de cualquier tabla de usuarios externa.
-- Migra únicamente los tres accesos autorizados y conserva contraseñas,
-- verificaciones existentes.

BEGIN;

DO $$
DECLARE
  usuarios_origen INTEGER;
BEGIN
  SELECT COUNT(*) INTO usuarios_origen
  FROM "User"
  WHERE lower("email") IN (
    'admin@eventos.com',
    'gestion@hermanascaradonti.com',
    'lola@hermanascaradonti.com'
  );

  IF usuarios_origen <> 3 THEN
    RAISE EXCEPTION
      'Se esperaban 3 usuarios autorizados en el origen y se encontraron %',
      usuarios_origen;
  END IF;
END $$;

DO $$
BEGIN
  CREATE TYPE "EventosUserRole" AS ENUM ('ADMIN', 'EMPLEADO');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "EventosUsuario" (
  "id" TEXT NOT NULL,
  "name" TEXT,
  "email" TEXT NOT NULL,
  "password" TEXT,
  "emailVerified" TIMESTAMP(3),
  "image" TEXT,
  "role" "EventosUserRole" NOT NULL DEFAULT 'EMPLEADO',
  "eventosPermisos" JSONB,
  "accesoTemporalHash" TEXT,
  "accesoTemporalExpiraAt" TIMESTAMP(3),
  "accesoTemporalIntentos" INTEGER NOT NULL DEFAULT 0,
  "accesoTemporalBloqueadoHasta" TIMESTAMP(3),
  "authVersion" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EventosUsuario_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EventosUsuario_email_key"
  ON "EventosUsuario"("email");

INSERT INTO "EventosUsuario" (
  "id", "name", "email", "password", "emailVerified", "image",
  "role", "eventosPermisos", "createdAt", "updatedAt"
)
SELECT
  "id",
  CASE
    WHEN lower("email") = 'admin@eventos.com' THEN 'Admin Eventos'
    ELSE "name"
  END,
  lower("email"),
  "password",
  "emailVerified",
  "image",
  'ADMIN'::"EventosUserRole",
  "eventosPermisos",
  "createdAt",
  "updatedAt"
FROM "User"
WHERE lower("email") IN (
  'admin@eventos.com',
  'gestion@hermanascaradonti.com',
  'lola@hermanascaradonti.com'
)
ON CONFLICT ("email") DO NOTHING;

DELETE FROM "EventosUsuario"
WHERE lower("email") NOT IN (
  'admin@eventos.com',
  'gestion@hermanascaradonti.com',
  'lola@hermanascaradonti.com'
);

COMMIT;
