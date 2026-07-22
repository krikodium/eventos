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
      <main className="mx-auto max-w-[1480px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <PageHeader eyebrow="Análisis" title="Reportes financieros" description="Analizá períodos puntuales o construí una lectura histórica de ingresos, costos, márgenes y resultados." status="Períodos e histórico" />
        <ReportesView />
      </main>
    </div>
  );
}
