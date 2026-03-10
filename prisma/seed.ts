import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Usuario admin por defecto: admin@eventos.com / admin123
  const adminPassword = await hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@eventos.com" },
    update: {},
    create: {
      email: "admin@eventos.com",
      password: adminPassword,
      name: "Administrador",
      role: "ADMIN",
      updatedAt: new Date(),
    },
  });
  console.log("Admin creado:", admin.email);

  // Usuario empleado de prueba: empleado@eventos.com / empleado123
  const empPassword = await hash("empleado123", 12);
  const empleado = await prisma.user.upsert({
    where: { email: "empleado@eventos.com" },
    update: {},
    create: {
      email: "empleado@eventos.com",
      password: empPassword,
      name: "Empleado Demo",
      role: "EMPLEADO",
      updatedAt: new Date(),
    },
  });
  console.log("Empleado creado:", empleado.email);

  // Rubros iniciales
  const rubros = await Promise.all([
    prisma.rubro.upsert({ where: { nombre: "Catering" }, update: {}, create: { nombre: "Catering" } }),
    prisma.rubro.upsert({ where: { nombre: "Música" }, update: {}, create: { nombre: "Música" } }),
    prisma.rubro.upsert({ where: { nombre: "Decoración" }, update: {}, create: { nombre: "Decoración" } }),
    prisma.rubro.upsert({ where: { nombre: "Iluminación" }, update: {}, create: { nombre: "Iluminación" } }),
    prisma.rubro.upsert({ where: { nombre: "Otros" }, update: {}, create: { nombre: "Otros" } }),
  ]);
  console.log("Rubros creados:", rubros.length);

  // Proveedores de ejemplo
  const catering = rubros.find((r) => r.nombre === "Catering")!;
  const musica = rubros.find((r) => r.nombre === "Música")!;
  const proveedoresCount = await prisma.proveedorEvento.count();
  if (proveedoresCount === 0) {
    await prisma.proveedorEvento.createMany({
      data: [
        { nombre: "Catering Premium SA", rubroId: catering.id, contacto: "011-1234-5678" },
        { nombre: "DJ Events", rubroId: musica.id, contacto: "011-9876-5432" },
      ],
    });
    console.log("Proveedores de ejemplo creados");
  }

  // Utileros de ejemplo
  const utilerosCount = await prisma.utilero.count();
  if (utilerosCount === 0) {
    await prisma.utilero.createMany({
      data: [
        { nombre: "Juan Pérez", tarifaPorDia: 15000 },
        { nombre: "María García", tarifaPorDia: 15000 },
      ],
    });
    console.log("Utileros de ejemplo creados");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
