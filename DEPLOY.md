# Deploy en Vercel + Neon

Eventos usa PostgreSQL en Neon y mantiene sus propias tablas de negocio y
autenticación. El build genera Prisma, pero no ejecuta migraciones
automáticamente.

## Preparar la base

Para una instalación nueva, ejecutar los scripts SQL en este orden:

1. `prisma/eventos-tables.sql`
2. `prisma/eventos-migration-usuarios-independientes.sql`
3. `prisma/eventos-sync-schema.sql`

Los scripts están preparados para ejecutarse desde el SQL Editor de Neon.

## Variables de entorno

| Variable | Uso |
|---|---|
| `DATABASE_URL` | Conexión PostgreSQL de Neon |
| `AUTH_SECRET` | Firma segura de sesiones |
| `APP_URL` | URL pública usada en emails |
| `EMAIL_PROVIDER` | Transporte de email |
| `SMTP_USER` | Usuario SMTP |
| `SMTP_PASS` | Contraseña de aplicación SMTP |
| `EMAIL_FROM` | Remitente visible |

## Deploy

El proyecto se despliega automáticamente en Vercel al actualizar la rama de
producción. El comando de build es:

```bash
prisma generate && next build
```

## Datos de demostración

`npm run db:seed` carga datos de ejemplo de eventos, proveedores y utileros.
No crea ni modifica usuarios.
