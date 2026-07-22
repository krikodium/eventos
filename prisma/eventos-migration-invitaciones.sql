-- Módulo Eventos: invitaciones con confirmación de email.
-- El admin crea el usuario SIN contraseña; se envía un email con un link tokenizado.
-- El invitado abre el link, define su contraseña y recién ahí queda activo.
-- Ejecutar en el mismo PostgreSQL que usa DATABASE_URL (Neon).
-- La tabla "User" ya tiene "password" (nullable) y "emailVerified"; no se modifica acá.

CREATE TABLE IF NOT EXISTS "EventosInvitacion" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt"    TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EventosInvitacion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EventosInvitacion_tokenHash_key"
  ON "EventosInvitacion"("tokenHash");

CREATE INDEX IF NOT EXISTS "EventosInvitacion_userId_idx"
  ON "EventosInvitacion"("userId");

DO $$
BEGIN
  ALTER TABLE "EventosInvitacion"
    ADD CONSTRAINT "EventosInvitacion_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
