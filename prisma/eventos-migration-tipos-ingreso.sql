-- Reemplaza los tipos de ingreso viejos por el esquema nuevo:
--   FACTURACION  -> PAGO   (era un cobro, no un hecho fiscal aparte)
--   PAGO_PARCIAL -> PAGO   (la numeración ahora se deriva de la fecha)
-- SENA y ANTICIPO quedan como estaban.
--
-- Idempotente: se puede correr varias veces.

UPDATE "Ingreso" SET "tipo" = 'PAGO'
WHERE "tipo" IN ('FACTURACION', 'PAGO_PARCIAL');

ALTER TABLE "Ingreso" ALTER COLUMN "tipo" SET DEFAULT 'PAGO';
