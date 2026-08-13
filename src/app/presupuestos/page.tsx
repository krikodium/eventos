import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { PageHeader } from "@/components/layout/page-header";
import { prisma } from "@/lib/prisma";
import { PresupuestosLanding } from "@/components/presupuestos/presupuestos-landing";

export default async function PresupuestosPage() {
  const session = await auth();
  if (!session?.user?.permisos) redirect("/login");
  const isAdmin = session.user.role === "ADMIN";
  if (!isAdmin && !session.user.permisos.navPresupuestos) {
    redirect("/eventos");
  }

  const eventosQuery = () =>
    prisma.evento.findMany({
      orderBy: { fecha: "desc" },
      include: {
        presupuestos: {
          select: { id: true, total: true, createdAt: true, presupuestoNro: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

  let eventos: Awaited<ReturnType<typeof eventosQuery>> = [];
  let libres: Awaited<ReturnType<typeof prisma.presupuesto.findMany>> = [];

  try {
    [eventos, libres] = await Promise.all([
      eventosQuery(),
      prisma.presupuesto.findMany({
        where: { eventoId: null },
        orderBy: { createdAt: "desc" },
      }),
    ]);
  } catch {
    // Tabla o columna todavía sin migrar: mostramos la pantalla vacía.
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-[1480px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <PageHeader
          eyebrow="Comercial"
          title="Presupuestos"
          description="Elegí el evento que querés presupuestar. Cada presupuesto queda guardado dentro de su evento."
          status={`${eventos.length} evento${eventos.length === 1 ? "" : "s"}`}
        />
        <PresupuestosLanding eventos={eventos} libres={libres} />
      </main>
    </div>
  );
}
