import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const utileros = await prisma.utilero.findMany({ orderBy: { nombre: "asc" } });
  return NextResponse.json(utileros);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const { nombre, tarifaPorDia } = body;
    if (!nombre || tarifaPorDia == null) {
      return NextResponse.json({ error: "Faltan nombre o tarifa" }, { status: 400 });
    }
    const utilero = await prisma.utilero.create({
      data: { nombre, tarifaPorDia: parseFloat(tarifaPorDia) },
    });
    return NextResponse.json(utilero);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al crear utilero" }, { status: 500 });
  }
}
