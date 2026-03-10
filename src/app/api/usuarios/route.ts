import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const { email, password, name, role } = body;
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Faltan campos: email, password, name" },
        { status: 400 }
      );
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "El email ya está registrado" }, { status: 400 });
    }
    const hashedPassword = await hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role === "ADMIN" ? "ADMIN" : "VENDEDOR",
      },
    });
    return NextResponse.json({ id: user.id, email: user.email, name: user.name, role: user.role });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al crear usuario" }, { status: 500 });
  }
}
