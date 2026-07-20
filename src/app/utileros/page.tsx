import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { UtilerosPorEvento } from "@/components/utileros/utileros-por-evento";
import { PageHeader } from "@/components/layout/page-header";

export default async function UtilerosPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <PageHeader eyebrow="Equipo operativo" title="Utileros por evento" description="Planificá armado, guardias, jornada de evento y desarme con costos claros por persona." status="Planificación de jornadas" />
        <UtilerosPorEvento />
      </main>
    </div>
  );
}
