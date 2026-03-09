import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { EventoForm } from "@/components/eventos/evento-form";
import { prisma } from "@/lib/prisma";

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
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Editar evento</h1>
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
          }}
        />
      </main>
    </div>
  );
}
