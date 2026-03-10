import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Usuario admin por defecto: admin@eventos.com / admin123
  const adminPassword = await hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@eventos.com" },
    update: { password: adminPassword, name: "Administrador", role: "ADMIN" },
    create: {
      email: "admin@eventos.com",
      password: adminPassword,
      name: "Administrador",
      role: "ADMIN",
    },
  });
  console.log("Admin creado:", admin.email);

  // Usuario empleado de prueba: empleado@eventos.com / empleado123
  const empPassword = await hash("empleado123", 12);
  const empleado = await prisma.user.upsert({
    where: { email: "empleado@eventos.com" },
    update: { password: empPassword, name: "Empleado Demo", role: "VENDEDOR" },
    create: {
      email: "empleado@eventos.com",
      password: empPassword,
      name: "Empleado Demo",
      role: "VENDEDOR",
    },
  });
  console.log("Empleado creado:", empleado.email);

  // Rubros, proveedores y utileros (solo si existen las tablas de Eventos)
  try {
    const rubros = await Promise.all([
      prisma.rubro.upsert({ where: { nombre: "Catering" }, update: {}, create: { nombre: "Catering" } }),
      prisma.rubro.upsert({ where: { nombre: "Música" }, update: {}, create: { nombre: "Música" } }),
      prisma.rubro.upsert({ where: { nombre: "Decoración" }, update: {}, create: { nombre: "Decoración" } }),
      prisma.rubro.upsert({ where: { nombre: "Iluminación" }, update: {}, create: { nombre: "Iluminación" } }),
      prisma.rubro.upsert({ where: { nombre: "Otros" }, update: {}, create: { nombre: "Otros" } }),
    ]);
    console.log("Rubros creados:", rubros.length);

    const catering = rubros.find((r) => r.nombre === "Catering")!;
    const musica = rubros.find((r) => r.nombre === "Música")!;
    const decoracion = rubros.find((r) => r.nombre === "Decoración")!;

    let proveedorCatering = await prisma.proveedorEvento.findFirst({ where: { nombre: "Catering Premium SA" } });
    if (!proveedorCatering) {
      proveedorCatering = await prisma.proveedorEvento.create({
        data: { nombre: "Catering Premium SA", rubroId: catering.id, contacto: "011-1234-5678" },
      });
    }
    let proveedorMusica = await prisma.proveedorEvento.findFirst({ where: { nombre: "DJ Events" } });
    if (!proveedorMusica) {
      proveedorMusica = await prisma.proveedorEvento.create({
        data: { nombre: "DJ Events", rubroId: musica.id, contacto: "011-9876-5432" },
      });
    }
    let proveedorDeco = await prisma.proveedorEvento.findFirst({ where: { nombre: "Florería y Deco" } });
    if (!proveedorDeco) {
      proveedorDeco = await prisma.proveedorEvento.create({
        data: { nombre: "Florería y Deco", rubroId: decoracion.id, contacto: "011-5555-1234" },
      });
    }
    console.log("Proveedores listos");

    let utilero1 = await prisma.utilero.findFirst({ where: { nombre: "Juan Pérez" } });
    if (!utilero1) {
      utilero1 = await prisma.utilero.create({ data: { nombre: "Juan Pérez", tarifaPorDia: 15000 } });
    }
    let utilero2 = await prisma.utilero.findFirst({ where: { nombre: "María García" } });
    if (!utilero2) {
      utilero2 = await prisma.utilero.create({ data: { nombre: "María García", tarifaPorDia: 15000 } });
    }
    console.log("Utileros listos");

    // 2 eventos con movimientos
    const eventosCount = await prisma.evento.count();
    if (eventosCount === 0) {
      const hoy = new Date();
      const en2Semanas = new Date(hoy);
      en2Semanas.setDate(en2Semanas.getDate() + 14);

      const evento1 = await prisma.evento.create({
        data: {
          nombre: "Casamiento López - Martínez",
          fecha: en2Semanas,
          tipo: "PARTICULAR",
          cliente: "Fam. López",
          estado: "CONFIRMADO",
          descripcion: "Casamiento en salón principal",
        },
      });
      const evento2 = await prisma.evento.create({
        data: {
          nombre: "Lanzamiento producto TechCorp",
          fecha: new Date(en2Semanas.getTime() + 7 * 24 * 60 * 60 * 1000),
          tipo: "CORPORATIVO",
          cliente: "TechCorp SA",
          estado: "BORRADOR",
          descripcion: "Evento corporativo con 150 invitados",
        },
      });

      // Evento 1: pagos, utileros, caja chica, ingresos
      await prisma.pagoProveedor.createMany({
        data: [
          { eventoId: evento1.id, proveedorId: proveedorCatering.id, rubroId: catering.id, monto: 450000, fecha: hoy },
          { eventoId: evento1.id, proveedorId: proveedorMusica.id, rubroId: musica.id, monto: 120000, fecha: hoy },
          { eventoId: evento1.id, proveedorId: proveedorDeco.id, rubroId: decoracion.id, monto: 85000, fecha: hoy, concepto: "Centros de mesa" },
        ],
      });
      await prisma.diaUtilero.createMany({
        data: [
          { eventoId: evento1.id, utileroId: utilero1.id, tipo: "ARMADO", dias: 0.5, monto: 7500 },
          { eventoId: evento1.id, utileroId: utilero1.id, tipo: "EVENTO", dias: 1, monto: 15000 },
          { eventoId: evento1.id, utileroId: utilero2.id, tipo: "EVENTO", dias: 1, monto: 15000 },
          { eventoId: evento1.id, utileroId: utilero2.id, tipo: "DESARME_EVENTO", dias: 0.5, monto: 7500 },
        ],
      });
      await prisma.cajaChicaEvento.createMany({
        data: [
          { eventoId: evento1.id, monto: 15000, empleadaEncargada: "María García", concepto: "Comida equipo armado" },
          { eventoId: evento1.id, monto: 5000, empleadaEncargada: "Juan Pérez", concepto: "Taxis" },
        ],
      });
      await prisma.ingreso.createMany({
        data: [
          { eventoId: evento1.id, monto: 200000, tipo: "ANTICIPO", fecha: hoy, concepto: "Anticipo 30%" },
          { eventoId: evento1.id, monto: 450000, tipo: "FACTURACION", fecha: hoy, numeroFactura: "F-001" },
        ],
      });

      // Evento 2: pagos, utileros, caja chica, ingresos
      await prisma.pagoProveedor.createMany({
        data: [
          { eventoId: evento2.id, proveedorId: proveedorCatering.id, rubroId: catering.id, monto: 320000, fecha: hoy, concepto: "Catering para 150 pax" },
          { eventoId: evento2.id, proveedorId: proveedorMusica.id, rubroId: musica.id, monto: 80000, fecha: hoy },
        ],
      });
      await prisma.diaUtilero.createMany({
        data: [
          { eventoId: evento2.id, utileroId: utilero1.id, tipo: "ARMADO", dias: 1, monto: 15000 },
          { eventoId: evento2.id, utileroId: utilero1.id, tipo: "GUARDIA", dias: 0.5, monto: 7500 },
          { eventoId: evento2.id, utileroId: utilero1.id, tipo: "EVENTO", dias: 1, monto: 15000 },
        ],
      });
      await prisma.cajaChicaEvento.create({
        data: {
          eventoId: evento2.id,
          monto: 25000,
          empleadaEncargada: "Juan Pérez",
          concepto: "Gastos varios equipo",
        },
      });
      await prisma.ingreso.createMany({
        data: [
          { eventoId: evento2.id, monto: 150000, tipo: "ANTICIPO", fecha: hoy, concepto: "Anticipo inicial" },
        ],
      });

      console.log("2 eventos con movimientos creados");
    }
  } catch (e) {
    console.log("Tablas de Eventos no creadas aún. Ejecuta prisma/eventos-tables.sql para crearlas.");
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
