import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const items = [
  { id: "1", concepto: "Alquiler de mobiliario y vajilla", cantidad: 120, precioInterno: 4200, precioCliente: 6500 },
  { id: "2", concepto: "Catering (menú 3 pasos)", cantidad: 120, precioInterno: 18000, precioCliente: 26000 },
  { id: "3", concepto: "Iluminación y sonido", cantidad: 1, precioInterno: 380000, precioCliente: 520000 },
  { id: "4", concepto: "Ambientación floral", cantidad: 12, precioInterno: 15000, precioCliente: 24000 },
  { id: "5", concepto: "Personal de servicio", cantidad: 8, precioInterno: 45000, precioCliente: 62000 },
];

async function main() {
  const totalCliente = items.reduce((s, i) => s + i.cantidad * i.precioCliente, 0);

  const presupuesto = await prisma.presupuesto.create({
    data: {
      empresa: "Azares",
      cliente: "Grupo Ternium",
      evento: "Cena anual de fin de año",
      fecha: new Date(new Date().getFullYear(), 11, 12),
      validez: 15,
      presupuestoNro: "0001",
      formaPago: "30% fact / 70% saldo",
      total: totalCliente,
      items,
      estadoEvento: "BORRADOR",
      honorariosTipo: "PORCENTAJE",
      honorariosMonto: 15,
      honorariosConcepto: "Honorarios HC",
      cargasSocialesPct: 0,
      impuestosPct: 21,
    },
  });

  console.log(`OK: ${presupuesto.id} · ${presupuesto.evento} · total ${totalCliente}`);
}

main().finally(() => prisma.$disconnect());
