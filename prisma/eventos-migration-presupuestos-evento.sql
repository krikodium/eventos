-- Vincula cada presupuesto con un evento (opcional).
-- Un presupuesto sin evento es un "presupuesto libre": todavía no se convirtió
-- en evento. Si el evento se borra, el presupuesto sobrevive con eventoId NULL.
--
-- Idempotente: se puede correr varias veces sin efecto.

ALTER TABLE "Presupuesto"
  ADD COLUMN IF NOT EXISTS "eventoId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Presupuesto_eventoId_fkey'
  ) THEN
    ALTER TABLE "Presupuesto"
      ADD CONSTRAINT "Presupuesto_eventoId_fkey"
      FOREIGN KEY ("eventoId") REFERENCES "Evento"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Presupuesto_eventoId_idx" ON "Presupuesto"("eventoId");
