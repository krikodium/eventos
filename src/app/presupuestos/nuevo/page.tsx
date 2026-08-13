import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { PageHeader } from "@/components/layout/page-header";
import { prisma } from "@/lib/prisma";
import { PresupuestosGenerator } from "@/components/presupuestos/presupuestos-generator";

export default async function NuevoPresupuestoPage({
  searchParams,
}: {
  searchParams: Promise<{ eventoId?: string; presupuestoId?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.permisos) redirect("/login");
  const isAdmin = session.user.role === "ADMIN";
  if (!isAdmin && !session.user.permisos.navPresupuestos) {
    redirect("/eventos");
  }

  const { eventoId, presupuestoId } = await searchParams;
  const evento = eventoId
    ? await prisma.evento.findUnique({ where: { id: eventoId } }).catch(() => null)
    : null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-[1480px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <nav className="mb-4 flex items-center gap-2 text-sm text-neutral-500">
          <Link href="/presupuestos" className="transition-colors hover:text-neutral-900">
            Presupuestos
          </Link>
          <span className="text-neutral-300">/</span>
          <span className="truncate font-medium text-neutral-900">
            {evento ? evento.nombre : "Sin evento"}
          </span>
        </nav>

        <PageHeader
          eyebrow="Comercial"
          title={evento ? `Presupuestar: ${evento.nombre}` : "Presupuesto sin evento"}
          description={
            evento
              ? "El presupuesto que guardes queda asociado a este evento."
              : "Presupuesto libre: podés asociarlo a un evento más adelante convirtiéndolo."
          }
          status="Cálculos en tiempo real"
        />

        <PresupuestosGenerator
          initialPresupuestoId={presupuestoId}
          evento={
            evento
              ? {
                  id: evento.id,
                  nombre: evento.nombre,
                  cliente: evento.cliente,
                  fecha: evento.fecha.toISOString(),
                  estado: evento.estado,
                  organizadora: evento.organizadora,
                  presupuestoNro: evento.presupuestoNro,
                  formaPagoAcordada: evento.formaPagoAcordada,
                }
              : undefined
          }
        />
      </main>
    </div>
  );
}
