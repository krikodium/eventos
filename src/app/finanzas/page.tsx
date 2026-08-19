import Link from "next/link";
import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { puedeVerFinanzas } from "@/lib/acceso-finanzas";
import { fetchCarteraEventos, totalesCartera, type EventoCartera } from "@/lib/cartera-eventos";
import { Navbar } from "@/components/layout/navbar";
import { PageHeader } from "@/components/layout/page-header";
import { CarteraEventos } from "@/components/dashboard/cartera-eventos";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";

function mensajeError(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return `[${error.code}] ${error.message}`;
  }
  if (error instanceof Error) return error.message;
  return String(error);
}

const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

export default async function FinanzasPage() {
  const session = await auth();
  if (!session?.user || !puedeVerFinanzas(session.user)) redirect("/");

  let cartera: EventoCartera[] = [];
  let errorCarga: string | null = null;
  try {
    cartera = await fetchCarteraEventos();
  } catch (error) {
    errorCarga = mensajeError(error);
    console.error("[FinanzasPage] Error al cargar la información financiera:", error);
  }

  const totales = totalesCartera(cartera);
  const indicadores = [
    { label: "Ingresos cobrados", valor: totales.cobrado, tono: "text-emerald-700" },
    { label: "Egresos registrados", valor: totales.egresos, tono: "text-neutral-950" },
    {
      label: "Resultado a hoy",
      valor: totales.resultado,
      tono: totales.resultado >= 0 ? "text-neutral-950" : "text-rose-700",
    },
    { label: "Saldo por cobrar", valor: totales.porCobrar, tono: "text-amber-700" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-[1480px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <PageHeader
          eyebrow="Gestión financiera"
          title="Finanzas"
          description="Cobranza, costos, resultados y cartera de eventos en un único lugar, fuera del panel operativo."
          status="Acceso restringido"
          actions={
            <Link
              href="/reportes"
              className="inline-flex items-center rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              Abrir reportes
            </Link>
          }
        />

        {errorCarga ? (
          <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-950 shadow-sm">
            <h2 className="text-sm font-semibold">No se pudieron cargar las finanzas</h2>
            <p className="mt-1 text-sm text-rose-800">
              Los importes no se reemplazaron por cero. Revisá la conexión o el esquema y volvé a intentar.
            </p>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-rose-200 bg-white/70 p-3 text-xs">
              {errorCarga}
            </pre>
          </section>
        ) : (
          <>
            <dl className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {indicadores.map((indicador) => (
                <div
                  key={indicador.label}
                  className="rounded-2xl border border-neutral-200 bg-white px-5 py-4 shadow-sm"
                >
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    {indicador.label}
                  </dt>
                  <dd className={`mt-2 text-2xl font-semibold tabular-nums ${indicador.tono}`}>
                    {money.format(indicador.valor)}
                  </dd>
                </div>
              ))}
            </dl>

            <section className="mb-6 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
              <div className="border-b border-neutral-100 px-5 py-4">
                <h2 className="text-sm font-semibold text-neutral-900">Composición del flujo</h2>
                <p className="mt-0.5 text-xs text-neutral-400">
                  Ingresos y egresos convertidos a ARS; eventos sin TC quedan fuera de los totales.
                </p>
              </div>
              <div className="p-5">
                <DashboardCharts
                  ingresos={totales.cobrado}
                  pagos={totales.proveedores}
                  utileros={totales.utileros}
                  cajaChica={totales.cajaChica}
                />
              </div>
            </section>

            <CarteraEventos eventos={cartera} />
          </>
        )}
      </main>
    </div>
  );
}
