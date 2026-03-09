import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const conUtileros = searchParams.get("conUtileros") === "1";

  const eventos = await prisma.evento.findMany({
    orderBy: { fecha: "desc" },
    include: conUtileros
      ? {
          diasUtileros: { include: { utilero: true } },
        }
      : undefined,
  });
  return NextResponse.json(eventos);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const { nombre, fecha, fechaFin, tipo, cliente, estado, descripcion } = body;
    if (!nombre || !fecha || !tipo || !cliente) {
      return NextResponse.json(
        { error: "Faltan campos requeridos: nombre, fecha, tipo, cliente" },
        { status: 400 }
      );
    }
    const evento = await prisma.evento.create({
      data: {
        nombre,
        fecha: new Date(fecha),
        fechaFin: fechaFin ? new Date(fechaFin) : null,
        tipo,
        cliente,
        estado: estado ?? "BORRADOR",
        descripcion: descripcion || null,
      },
    });
    return NextResponse.json(evento);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al crear evento" }, { status: 500 });
  }
}
