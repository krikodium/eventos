import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { UsuariosManager } from "@/components/usuarios/usuarios-manager";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { PageHeader } from "@/components/layout/page-header";

export default async function UsuariosPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");

  type UsuarioRow = {
    id: string;
    email: string;
    name: string | null;
    role: string;
    eventosPermisos: Prisma.JsonValue | null;
    password: string | null;
    accesoTemporalHash: string | null;
    accesoTemporalExpiraAt: Date | null;
  };

  const users = await prisma.$queryRaw<UsuarioRow[]>(Prisma.sql`
    SELECT id, email, name, role::text AS role, "eventosPermisos", password,
      "accesoTemporalHash", "accesoTemporalExpiraAt"
    FROM "EventosUsuario"
    ORDER BY "createdAt" DESC
  `);

  const usuarios = users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name ?? "",
    role: String(u.role),
    eventosPermisos: u.eventosPermisos,
    estado: (u.password
      ? "ACTIVO"
      : u.accesoTemporalHash && u.accesoTemporalExpiraAt
        ? u.accesoTemporalExpiraAt > new Date() ? "PENDIENTE" : "VENCIDO"
        : "SIN_ACCESO") as "ACTIVO" | "PENDIENTE" | "VENCIDO" | "SIN_ACCESO",
    accesoTemporalExpiraAt: u.accesoTemporalExpiraAt?.toISOString() ?? null,
    esActual: u.id === session.user.id,
  }));

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <PageHeader eyebrow="Administración" title="Usuarios y permisos" description="Gestioná accesos, roles y permisos granulares para cada integrante del equipo." status={`${usuarios.length} usuarios registrados`} />
        <UsuariosManager usuarios={usuarios} />
      </main>
    </div>
  );
}
