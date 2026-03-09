import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const rubros = await prisma.rubro.findMany({ orderBy: { nombre: "asc" } });
  return NextResponse.json(rubros);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const { nombre } = body;
    if (!nombre) return NextResponse.json({ error: "Falta nombre" }, { status: 400 });
    const rubro = await prisma.rubro.create({ data: { nombre } });
    return NextResponse.json(rubro);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al crear rubro" }, { status: 500 });
  }
}
