-- Ejecutar UNA VEZ en Neon SQL Editor para limpiar la migración fallida
-- Luego eliminar este archivo si quieres

DELETE FROM _prisma_migrations 
WHERE migration_name = '20250304000000_init_postgres';
