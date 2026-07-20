import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { EventoForm } from "@/components/eventos/evento-form";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";

export default async function EditarEventoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");

  const { id } = await params;
  const evento = await prisma.evento.findUnique({ where: { id } });
  if (!evento) notFound();

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <Link
          href={`/eventos/${id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors mb-3"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver
        </Link>
        <PageHeader eyebrow="Eventos" title={`Editar ${evento.nombre}`} description="Actualizá los datos generales y comerciales sin modificar los movimientos ya registrados." status="Edición activa" />
        <EventoForm
          evento={{
            id: evento.id,
            nombre: evento.nombre,
            fecha: evento.fecha.toISOString(),
            fechaFin: evento.fechaFin?.toISOString() ?? undefined,
            tipo: evento.tipo,
            cliente: evento.cliente,
            estado: evento.estado,
            descripcion: evento.descripcion ?? undefined,
            organizadora: evento.organizadora ?? undefined,
            provincia: evento.provincia ?? undefined,
            localidad: evento.localidad ?? undefined,
            presupuestoTotal: evento.presupuestoTotal ?? undefined,
            presupuestoNro: evento.presupuestoNro ?? undefined,
            formaPagoAcordada: evento.formaPagoAcordada ?? undefined,
            honorariosHC: evento.honorariosHC ?? undefined,
            viaticosArmado: evento.viaticosArmado ?? undefined,
          }}
        />
      </main>
    </div>
  );
}
