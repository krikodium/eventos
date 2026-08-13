# Sistema de Gestión de Eventos HC

Aplicación interna para administrar presupuestos, eventos, proveedores,
utileros, ingresos, caja chica, reportes y accesos del equipo.

## Requisitos

- Node.js 20+
- PostgreSQL
- npm

## Desarrollo

```bash
npm install
npm run dev
```

Variables mínimas en `.env`:

```env
DATABASE_URL="postgresql://..."
AUTH_SECRET="..."
```

## Base de datos

El esquema está en `prisma/schema.prisma`. Para instalaciones nuevas, seguir
el orden de scripts documentado en `DEPLOY.md`.

La autenticación usa la tabla propia `EventosUsuario`, con roles `ADMIN` y
`EMPLEADO`. Las altas y recuperaciones se administran desde el panel de
usuarios mediante claves temporales de un solo uso, sin correo externo.

## Comandos

```bash
npm run dev
npm run lint
npm run build
npm run db:diagnostico
npm run db:seed
```

El seed carga únicamente datos operativos de demostración; nunca crea cuentas.
