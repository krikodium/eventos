import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { prisma } from "@/lib/prisma";
import { CajaMovil, type CajaEvento } from "@/components/caja/caja-movil";
import { CAJA_SENTIDO_INGRESO } from "@/lib/caja-chica-pesos";

export default async function CajaChicaPage({
  searchParams,
}: {
  searchParams: Promise<{ evento?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.permisos) redirect("/login");
  const isAdmin = session.user.role === "ADMIN";
  if (!isAdmin && !session.user.permisos.cajaChicaVer) redirect("/");

  const { evento: eventoInicial } = await searchParams;

  // Solo eventos vigentes: cargar un gasto en un evento facturado hace un año
  // casi siempre es un error de selección.
  const eventos = await prisma.evento.findMany({
    where: { estado: { in: ["BORRADOR", "CONFIRMADO", "EN_CURSO", "FINALIZADO"] } },
    orderBy: { fecha: "desc" },
    select: {
      id: true,
      nombre: true,
      cliente: true,
      fecha: true,
      estado: true,
      cajaChica: {
        orderBy: { fecha: "desc" },
        select: {
          id: true,
          monto: true,
          sentido: true,
          metodoPago: true,
          concepto: true,
          empleadaEncargada: true,
          fecha: true,
        },
      },
    },
  });

  const cajas: CajaEvento[] = eventos.map((e) => ({
    id: e.id,
    nombre: e.nombre,
    cliente: e.cliente,
    fecha: e.fecha.toISOString(),
    estado: e.estado,
    // Saldo = lo que entró a la caja menos lo que salió.
    saldo: e.cajaChica.reduce(
      (sum, m) => sum + (m.sentido === CAJA_SENTIDO_INGRESO ? m.monto : -m.monto),
      0
    ),
    movimientos: e.cajaChica.map((m) => ({
      id: m.id,
      monto: m.monto,
      sentido: m.sentido ?? "EGRESO",
      metodoPago: m.metodoPago ?? null,
      concepto: m.concepto,
      empleadaEncargada: m.empleadaEncargada,
      fecha: m.fecha.toISOString(),
    })),
  }));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
        <header className="mb-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Operación
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-neutral-950">
            Caja chica
          </h1>
          <p className="mt-1 text-[13px] text-neutral-500">
            Cargá gastos operativos en el momento, desde donde estés.
          </p>
        </header>

        <CajaMovil
          eventos={cajas}
          nombreUsuario={session.user.name ?? session.user.email ?? ""}
          eventoInicial={eventoInicial}
        />
      </main>
    </div>
  );
}
