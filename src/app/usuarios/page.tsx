import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { UsuariosManager } from "@/components/usuarios/usuarios-manager";
import { prisma } from "@/lib/prisma";

export default async function UsuariosPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");

  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true },
    orderBy: { createdAt: "desc" },
  });

  const usuarios = users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name ?? "",
    role: String(u.role),
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Usuarios</h1>
        <UsuariosManager usuarios={usuarios} />
      </main>
    </div>
  );
}
