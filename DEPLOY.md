# Deploy en Vercel + Neon

## 1. Base de datos (Neon)

- En [Vercel](https://vercel.com): **Project Settings → Storage → Create Database → Neon**
- O en [neon.tech](https://neon.tech): crear proyecto y copiar la connection string
- Usa la URL **pooled** (con `-pooler` en el host) para serverless

## 2. Variables de entorno en Vercel

En **Project Settings → Environment Variables** añade:

| Variable       | Valor                                      | Notas                          |
|----------------|--------------------------------------------|--------------------------------|
| `DATABASE_URL` | `postgresql://...@...-pooler.../neondb?sslmode=require` | La que te da Neon/Vercel       |
| `AUTH_SECRET`  | `openssl rand -base64 32`                   | Ejecuta el comando y pega el resultado |
| `NEXTAUTH_URL` | `https://tu-proyecto.vercel.app`           | Tu URL de producción (o déjalo vacío y Vercel usará `VERCEL_URL`) |

## 3. Deploy

```bash
vercel
```

O conecta el repo en GitHub y Vercel hará deploy automático en cada push.

## 4. Seed (opcional)

Tras el primer deploy, si quieres usuarios de prueba:

```bash
DATABASE_URL="tu-url-de-neon" npx prisma db seed
```

Usuarios de prueba:
- **Admin:** `admin@eventos.com` / `admin123`
- **Empleado:** `empleado@eventos.com` / `empleado123`
