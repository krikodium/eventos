import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { EventoForm } from "@/components/eventos/evento-form";
import { PageHeader } from "@/components/layout/page-header";

export default async function NuevoEventoPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <PageHeader eyebrow="Eventos" title="Crear nuevo evento" description="Definí la información comercial y operativa inicial. Después vas a poder completar costos, equipo y movimientos." status="Nuevo registro" />
        <EventoForm />
      </main>
    </div>
  );
}
