-- Tope de caja chica en pesos, definido por admin al editar el evento.
ALTER TABLE "Evento" ADD COLUMN IF NOT EXISTS "cajaChicaAsignadaArs" DOUBLE PRECISION;
