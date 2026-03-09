# Sistema de Gestión de Eventos Privados

Sistema para gestión de eventos corporativos y particulares con jerarquía Admin-Empleado.

## Características

- **Autenticación**: Login con email/contraseña, roles Admin y Empleado
- **Eventos**: CRUD de eventos (nombre, fecha, tipo, cliente, estado)
- **Proveedores y rubros**: Catálogos gestionados por admins
- **Pagos a proveedores**: Registro por evento (empleados y admins)
- **Utileros**: Catálogo de utileros con tarifa/día, registro de días trabajados
- **Ingresos**: Registro de facturación, anticipos, pagos parciales (solo admins)
- **Reportes**: Por rubro, por proveedor, exportación Excel y CSV

## Requisitos

- Node.js 18+
- npm

## Instalación y setup de Prisma

```bash
# 1. Instalar dependencias (genera el cliente Prisma automáticamente)
npm install

# 2. Verificar que .env tenga:
#    DATABASE_URL="file:./dev.db"
#    AUTH_SECRET="tu-secreto"

# 3. Si es la primera vez, crear la base de datos y datos iniciales:
npm run db:setup

# O por separado:
# npx prisma migrate dev    # Crea/aplica migraciones
# npm run db:seed            # Usuarios y datos de prueba
```

**Base de datos**: SQLite en `prisma/dev.db`. Para PostgreSQL, cambiar `DATABASE_URL` y `provider` en `prisma/schema.prisma`.

## Usuarios de prueba

| Email | Contraseña | Rol |
|-------|------------|-----|
| admin@eventos.com | admin123 | Admin |
| empleado@eventos.com | empleado123 | Empleado |

## Ejecutar

```bash
# Desarrollo
npm run dev

# Producción
npm run build
npm start
```

Abrir http://localhost:3000

## Estructura de permisos

| Acción | Admin | Empleado |
|--------|-------|----------|
| Crear/editar eventos | ✓ | ✗ |
| Ver eventos | ✓ | ✓ |
| Registrar pagos a proveedores | ✓ | ✓ |
| Registrar días de utileros | ✓ | ✓ |
| Registrar ingresos | ✓ | ✗ |
| Gestionar proveedores/rubros | ✓ | ✗ |
| Gestionar utileros | ✓ | ✗ |
| Reportes | ✓ | ✗ |
| Crear usuarios | ✓ | ✗ |
