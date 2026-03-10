-- Tablas propias de Eventos (BD compartida con Shop y Deco)
-- Ejecutar UNA VEZ contra la BD. Shop no crea estas tablas.
-- Si ya existen, ignorar los errores "relation already exists".

-- Evento
CREATE TABLE IF NOT EXISTS "Evento" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "nombre" TEXT NOT NULL,
  "fecha" TIMESTAMP(3) NOT NULL,
  "fechaFin" TIMESTAMP(3),
  "tipo" TEXT NOT NULL,
  "cliente" TEXT NOT NULL,
  "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
  "descripcion" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Rubro
CREATE TABLE IF NOT EXISTS "Rubro" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "nombre" TEXT NOT NULL UNIQUE
);

-- ProveedorEvento (diferente a Proveedor de Shop)
CREATE TABLE IF NOT EXISTS "ProveedorEvento" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "nombre" TEXT NOT NULL,
  "rubroId" TEXT NOT NULL REFERENCES "Rubro"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "contacto" TEXT,
  "cuit" TEXT,
  "razonSocial" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- PagoProveedor
CREATE TABLE IF NOT EXISTS "PagoProveedor" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "eventoId" TEXT NOT NULL REFERENCES "Evento"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "proveedorId" TEXT NOT NULL REFERENCES "ProveedorEvento"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "rubroId" TEXT NOT NULL REFERENCES "Rubro"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "monto" DOUBLE PRECISION NOT NULL,
  "fecha" TIMESTAMP(3) NOT NULL,
  "concepto" TEXT,
  "metodoPago" TEXT NOT NULL DEFAULT 'TRANSFERENCIA',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "PagoProveedor_eventoId_idx" ON "PagoProveedor"("eventoId");
CREATE INDEX IF NOT EXISTS "PagoProveedor_proveedorId_idx" ON "PagoProveedor"("proveedorId");

-- Utilero
CREATE TABLE IF NOT EXISTS "Utilero" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "nombre" TEXT NOT NULL,
  "tarifaPorDia" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- DiaUtilero
CREATE TABLE IF NOT EXISTS "DiaUtilero" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "eventoId" TEXT NOT NULL REFERENCES "Evento"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "utileroId" TEXT NOT NULL REFERENCES "Utilero"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "tipo" TEXT NOT NULL DEFAULT 'EVENTO',
  "dias" DOUBLE PRECISION NOT NULL,
  "monto" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiaUtilero_eventoId_utileroId_tipo_key" UNIQUE ("eventoId", "utileroId", "tipo")
);
CREATE INDEX IF NOT EXISTS "DiaUtilero_eventoId_idx" ON "DiaUtilero"("eventoId");

-- CajaChicaEvento (diferente a CajaChica de Shop)
CREATE TABLE IF NOT EXISTS "CajaChicaEvento" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "eventoId" TEXT NOT NULL REFERENCES "Evento"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "monto" DOUBLE PRECISION NOT NULL,
  "empleadaEncargada" TEXT NOT NULL,
  "concepto" TEXT,
  "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "CajaChicaEvento_eventoId_idx" ON "CajaChicaEvento"("eventoId");

-- Ingreso
CREATE TABLE IF NOT EXISTS "Ingreso" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "eventoId" TEXT NOT NULL REFERENCES "Evento"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "monto" DOUBLE PRECISION NOT NULL,
  "concepto" TEXT,
  "fecha" TIMESTAMP(3) NOT NULL,
  "tipo" TEXT NOT NULL DEFAULT 'FACTURACION',
  "numeroFactura" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Ingreso_eventoId_idx" ON "Ingreso"("eventoId");
