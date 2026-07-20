import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { ReportesView } from "@/components/reportes/reportes-view";
import { PageHeader } from "@/components/layout/page-header";

export default async function ReportesPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <PageHeader eyebrow="Análisis" title="Reportes financieros" description="Leé ingresos, costos, márgenes y distribución de gastos para tomar decisiones con contexto." status="Datos consolidados" />
        <ReportesView />
      </main>
    </div>
  );
}
