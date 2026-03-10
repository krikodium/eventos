# Deploy en Vercel + Neon (BD compartida con Shop y Deco)

Eventos comparte la base de datos con Shop y Deco. **Shop gestiona las migraciones**; Eventos solo usa `prisma generate`.

## 1. Resolver la migración fallida (solo si el build falló con P3018)

Si en producción viste el error `relation "User" already exists`, ejecuta una vez contra la BD:

```bash
DATABASE_URL="tu-url-neon" npx prisma migrate resolve --rolled-back "20250304000000_init_postgres"
```

## 2. Crear tablas de Eventos (solo si no existen)

Las tablas de Eventos no existen en la BD compartida hasta que las crees. Ejecuta una vez:

```bash
# Con psql (reemplaza DATABASE_URL por tu URL):
psql "postgresql://..." -f prisma/eventos-tables.sql

# O desde Neon Dashboard: SQL Editor → pega el contenido de prisma/eventos-tables.sql
```

## 3. Variables de entorno en Vercel

| Variable       | Valor                                      |
|----------------|--------------------------------------------|
| `DATABASE_URL` | URL de Neon (pooled)                        |
| `AUTH_SECRET`  | Resultado de `openssl rand -base64 32`     |
| `NEXTAUTH_URL` | `https://tu-proyecto.vercel.app`           |

## 4. Deploy

```bash
vercel
```

El build ejecuta solo `prisma generate && next build` (sin `migrate deploy`).

## 5. Seed (opcional)

Para usuarios de prueba de Eventos:

```bash
DATABASE_URL="tu-url" npx prisma db seed
```

- **Admin:** `admin@eventos.com` / `admin123`
- **Empleado:** `empleado@eventos.com` / `empleado123`
