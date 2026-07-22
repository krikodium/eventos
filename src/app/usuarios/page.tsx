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

  type RowConPermisos = {
    id: string;
    email: string;
    name: string | null;
    role: string;
    eventosPermisos: Prisma.JsonValue | null;
    password: string | null;
  };

  type RowSinPermisos = {
    id: string;
    email: string;
    name: string | null;
    role: string;
    password: string | null;
  };

  let users: RowConPermisos[];

  try {
    users = await prisma.$queryRaw<RowConPermisos[]>(Prisma.sql`
      SELECT id, email, name, role::text AS role, "eventosPermisos", password
      FROM "User"
      ORDER BY "createdAt" DESC
    `);
  } catch {
    const basic = await prisma.$queryRaw<RowSinPermisos[]>(Prisma.sql`
      SELECT id, email, name, role::text AS role, password
      FROM "User"
      ORDER BY "createdAt" DESC
    `);
    users = basic.map((u) => ({ ...u, eventosPermisos: null }));
  }

  const usuarios = users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name ?? "",
    role: String(u.role),
    eventosPermisos: u.eventosPermisos,
    activado: Boolean(u.password),
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
