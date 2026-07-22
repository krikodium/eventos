import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { PresupuestosGenerator } from "@/components/presupuestos/presupuestos-generator";
import { PageHeader } from "@/components/layout/page-header";

export default async function PresupuestosPage() {
  const session = await auth();
  if (!session?.user?.permisos) redirect("/login");
  const isAdmin = session.user.role === "ADMIN";
  if (!isAdmin && !session.user.permisos.navPresupuestos) {
    redirect("/eventos");
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navbar />
      <main className="mx-auto max-w-[1480px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <PageHeader eyebrow="Comercial" title="Armado de presupuestos" description="Construí la propuesta, controlá costos y margen, y convertí el presupuesto aprobado en un evento." status="Cálculos en tiempo real" />
        <PresupuestosGenerator />
      </main>
    </div>
  );
}
