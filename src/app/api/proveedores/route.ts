import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const proveedores = await prisma.proveedor.findMany({
    include: { rubro: true },
    orderBy: { nombre: "asc" },
  });
  return NextResponse.json(proveedores);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const { nombre, rubroId, contacto, cuit, razonSocial } = body;
    if (!nombre || !rubroId) {
      return NextResponse.json({ error: "Faltan nombre o rubro" }, { status: 400 });
    }
    const proveedor = await prisma.proveedor.create({
      data: {
        nombre,
        rubroId,
        contacto: contacto || null,
        cuit: cuit || null,
        razonSocial: razonSocial || null,
      },
    });
    return NextResponse.json(proveedor);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al crear proveedor" }, { status: 500 });
  }
}
