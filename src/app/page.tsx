import Link from "next/link";
import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/layout/navbar";
import { EstadoEventoBadge } from "@/components/ui/estado-badge";

type EventoReciente = {
  id: string;
  nombre: string;
  cliente: string;
  organizadora: string | null;
  fecha: Date;
  estado: string;
  tipo: string;
};

function mensajeDb(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return `[${error.code}] ${error.message}`;
  }
  if (error instanceof Error) return error.message;
  return String(error);
}

function saludo(): string {
  const hora = new Date().getHours();
  if (hora < 12) return "Buenos días";
  if (hora < 19) return "Buenas tardes";
  return "Buenas noches";
}

const fechaFmt = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default async function HomePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isAdmin = session.user.role === "ADMIN";
  let eventosMes = 0;
  let eventosProximos = 0;
  let eventosActivos = 0;
  let eventosBorrador = 0;
  let eventosRecientes: EventoReciente[] = [];
  let proximoEvento: EventoReciente | null = null;
  let errorCarga: string | null = null;

  try {
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const finMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59);
    const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const seleccion = {
      id: true,
      nombre: true,
      cliente: true,
      organizadora: true,
      fecha: true,
      estado: true,
      tipo: true,
    } as const;

    const [mes, proximos, activos, borradores, recientes, proximo] = await Promise.all([
      prisma.evento.count({ where: { fecha: { gte: inicioMes, lte: finMes } } }),
      prisma.evento.count({ where: { fecha: { gte: inicioHoy } } }),
      prisma.evento.count({ where: { estado: { in: ["CONFIRMADO", "EN_CURSO"] } } }),
      prisma.evento.count({ where: { estado: "BORRADOR" } }),
      prisma.evento.findMany({ take: 8, orderBy: { fecha: "desc" }, select: seleccion }),
      prisma.evento.findFirst({
        where: { fecha: { gte: inicioHoy } },
        orderBy: { fecha: "asc" },
        select: seleccion,
      }),
    ]);

    eventosMes = mes;
    eventosProximos = proximos;
    eventosActivos = activos;
    eventosBorrador = borradores;
    eventosRecientes = recientes;
    proximoEvento = proximo;
  } catch (error) {
    errorCarga = mensajeDb(error);
    console.error("[HomePage] Error al cargar indicadores de eventos:", error);
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
              Panel de eventos
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-neutral-950 sm:text-[36px]">
              {saludo()}, {session.user.name?.split(" ")[0] ?? "Usuario"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-neutral-600">
              Fechas, estados y próximos eventos. La información monetaria vive únicamente en Finanzas.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/eventos"
              className="inline-flex items-center rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-800 transition hover:border-neutral-300 hover:bg-neutral-50"
            >
              Ver eventos
            </Link>
            {isAdmin && (
              <Link
                href="/eventos/nuevo"
                className="inline-flex items-center rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
              >
                Nuevo evento
              </Link>
            )}
          </div>
        </header>

        {errorCarga ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
            <h2 className="text-sm font-semibold">No se pudieron cargar los indicadores de eventos</h2>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-amber-200 bg-white/70 p-3 text-xs">
              {errorCarga}
            </pre>
          </section>
        ) : (
          <>
            <section className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Link
                href={proximoEvento ? `/eventos/${proximoEvento.id}` : "/eventos"}
                className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-neutral-300 hover:shadow-md"
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  Próximo evento
                </p>
                {proximoEvento ? (
                  <>
                    <p className="mt-2 truncate text-base font-semibold text-neutral-950">
                      {proximoEvento.nombre}
                    </p>
                    <p className="mt-1 truncate text-xs text-neutral-500">{proximoEvento.cliente}</p>
                    <p className="mt-3 text-sm font-medium text-neutral-700">
                      {fechaFmt.format(proximoEvento.fecha)}
                    </p>
                  </>
                ) : (
                  <p className="mt-3 text-sm text-neutral-400">Sin fechas próximas</p>
                )}
              </Link>

              {[
                ["Por venir", eventosProximos, "Eventos desde hoy"],
                ["En foco", eventosActivos, "Confirmados o en curso"],
                ["Este mes", eventosMes, `${eventosBorrador} en borrador`],
              ].map(([label, valor, detalle]) => (
                <div key={String(label)} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    {label}
                  </p>
                  <p className="mt-2 text-3xl font-semibold tabular-nums text-neutral-950">{valor}</p>
                  <p className="mt-1 text-xs text-neutral-500">{detalle}</p>
                </div>
              ))}
            </section>

            <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-4 border-b border-neutral-100 px-5 py-4">
                <div>
                  <h2 className="text-sm font-semibold text-neutral-900">Eventos recientes</h2>
                  <p className="mt-0.5 text-xs text-neutral-400">Últimos eventos por fecha y estado</p>
                </div>
                <Link href="/eventos" className="text-xs font-semibold text-neutral-500 hover:text-neutral-900">
                  Ver todos →
                </Link>
              </div>
              {eventosRecientes.length === 0 ? (
                <p className="px-5 py-16 text-center text-sm text-neutral-400">Todavía no hay eventos cargados.</p>
              ) : (
                <div className="grid gap-3 p-5 md:grid-cols-2">
                  {eventosRecientes.map((evento) => (
                    <Link
                      key={evento.id}
                      href={`/eventos/${evento.id}`}
                      className="group rounded-2xl border border-neutral-100 bg-neutral-50/60 p-4 transition hover:border-neutral-200 hover:bg-white hover:shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-neutral-950">{evento.nombre}</p>
                          <p className="mt-1 truncate text-xs text-neutral-500">{evento.cliente}</p>
                        </div>
                        <EstadoEventoBadge estado={evento.estado} />
                      </div>
                      <div className="mt-4 flex items-end justify-between gap-4 border-t border-neutral-100 pt-3">
                        <div>
                          <p className="text-xs font-medium text-neutral-700">{fechaFmt.format(evento.fecha)}</p>
                          <p className="mt-0.5 text-[11px] text-neutral-400">
                            {evento.organizadora ?? (evento.tipo === "CORPORATIVO" ? "Corporativo" : "Particular")}
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-neutral-400 transition group-hover:text-neutral-900">
                          Abrir →
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
