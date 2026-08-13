import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { PageHeader } from "@/components/layout/page-header";
import {
  UtilerosWorkspace,
  type UtileroHistorial,
} from "@/components/utileros/utileros-workspace";
import { prisma } from "@/lib/prisma";

export default async function UtilerosPage({
  searchParams,
}: {
  searchParams: Promise<{ utilero?: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");

  const [{ utilero: utileroSeleccionado }, utileros] = await Promise.all([
    searchParams,
    prisma.utilero.findMany({
      orderBy: { nombre: "asc" },
      include: {
        diasTrabajados: {
          orderBy: { createdAt: "desc" },
          include: {
            evento: {
              select: {
                id: true,
                nombre: true,
                cliente: true,
                fecha: true,
                fechaFin: true,
                estado: true,
                tipo: true,
              },
            },
          },
        },
        enEventos: {
          include: {
            evento: {
              select: {
                id: true,
                nombre: true,
                cliente: true,
                fecha: true,
                fechaFin: true,
                estado: true,
                tipo: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const data: UtileroHistorial[] = utileros.map((utilero) => ({
    id: utilero.id,
    nombre: utilero.nombre,
    tarifaPorDia: utilero.tarifaPorDia,
    tarifaArmado: utilero.tarifaArmado,
    tarifaDesarmeEvento: utilero.tarifaDesarmeEvento,
    tarifaDesarmeDepo: utilero.tarifaDesarmeDepo,
    tarifaGuardia: utilero.tarifaGuardia,
    tareas: utilero.diasTrabajados.map((tarea) => ({
      id: tarea.id,
      tipo: tarea.tipo,
      dias: tarea.dias,
      monto: tarea.monto,
      createdAt: tarea.createdAt.toISOString(),
      evento: {
        ...tarea.evento,
        fecha: tarea.evento.fecha.toISOString(),
        fechaFin: tarea.evento.fechaFin?.toISOString() ?? null,
      },
    })),
    asignaciones: utilero.enEventos.map((asignacion) => ({
      id: asignacion.id,
      eventoId: asignacion.eventoId,
      anticipo: asignacion.anticipo,
      montoTransferencia: asignacion.montoTransferencia,
      montoEfectivo: asignacion.montoEfectivo,
      evento: {
        ...asignacion.evento,
        fecha: asignacion.evento.fecha.toISOString(),
        fechaFin: asignacion.evento.fechaFin?.toISOString() ?? null,
      },
    })),
  }));

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navbar />
      <main className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <PageHeader
          eyebrow="Equipo operativo"
          title="Utileros"
          description="Consultá cada persona, sus tarifas vigentes, cotizaciones e historial completo de eventos y tareas."
          status={`${data.length} ${data.length === 1 ? "utilero" : "utileros"}`}
        />
        <UtilerosWorkspace
          initialUtileros={data}
          initialSelectedId={utileroSeleccionado}
        />
      </main>
    </div>
  );
}
