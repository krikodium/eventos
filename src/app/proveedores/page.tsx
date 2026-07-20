import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { ProveedoresManager } from "@/components/proveedores/proveedores-manager";
import { PageHeader } from "@/components/layout/page-header";

export default async function ProveedoresPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <PageHeader eyebrow="Operaciones" title="Proveedores y rubros" description="Organizá la red de proveedores por especialidad y mantené sus datos listos para cada evento." status="Catálogo operativo" />
        <ProveedoresManager />
      </main>
    </div>
  );
}
