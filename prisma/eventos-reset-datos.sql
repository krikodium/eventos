-- Vacía los datos de negocio de Eventos y CONSERVA las cuentas de usuario
-- ("EventosUsuario" / "EventosInvitacion") para no perder el acceso.
--
-- Uso: psql "$DATABASE_URL" -f prisma/eventos-reset-datos.sql
--      o pegar en el SQL Editor de Neon.
--
-- IRREVERSIBLE. No hay vuelta atrás sin un backup.

BEGIN;

TRUNCATE TABLE
  "Ingreso",
  "CajaChicaEvento",
  "UtileroEnEvento",
  "DiaUtilero",
  "PagoProveedor",
  "Utilero",
  "ProveedorEvento",
  "Rubro",
  "Presupuesto",
  "Evento"
RESTART IDENTITY CASCADE;

COMMIT;
