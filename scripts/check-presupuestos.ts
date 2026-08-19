import {
  importesLinea,
  margenPresupuesto,
  repartoPorCanal,
  resumenPresupuesto,
  totalesPorSector,
  type SectorConLineas,
} from "../src/lib/presupuestos/importes";
import {
  agruparPagosPorProveedor,
  estadoDePago,
  totalesPagos,
  type LineaParaPago,
} from "../src/lib/presupuestos/estado-pagos";
import { validarLinea, parseImporte } from "../src/lib/presupuestos/validar-linea";
import { aCanalPago, esCanalPagoValido } from "../src/lib/presupuestos/canal-pago";

let fallos = 0;
function check(nombre: string, real: unknown, esperado: unknown) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) fallos++;
  console.log(
    `${ok ? "OK  " : "FALLA"} ${nombre}${
      ok ? "" : `\n      esperado ${JSON.stringify(esperado)}\n      obtuve   ${JSON.stringify(real)}`
    }`
  );
}

// ── Importes de línea ──────────────────────────────────────────────
check("importe de línea = cantidad × precio", importesLinea({
  cantidad: 3, costoUnitario: 100, precioUnitario: 150, moneda: "ARS", canalPago: "EFECTIVO",
}), { costo: 300, cliente: 450 });

check("línea deshabilitada no suma", importesLinea({
  cantidad: 3, costoUnitario: 100, precioUnitario: 150, moneda: "ARS",
  canalPago: "EFECTIVO", deshabilitado: true,
}), { costo: 0, cliente: 0 });

// ── Sectores con alternativas ──────────────────────────────────────
const sectores: SectorConLineas[] = [
  {
    id: "base", nombre: "Ambientación", grupoOpcion: null, elegido: false,
    lineas: [
      { cantidad: 10, costoUnitario: 100, precioUnitario: 200, moneda: "ARS", canalPago: "EFECTIVO" },
      { cantidad: 1, costoUnitario: 500, precioUnitario: 900, moneda: "ARS", canalPago: "TRANSFERENCIA" },
    ],
  },
  {
    id: "catA", nombre: "Catering premium", grupoOpcion: "Catering", elegido: true,
    lineas: [{ cantidad: 100, costoUnitario: 50, precioUnitario: 80, moneda: "ARS", canalPago: "A_DEFINIR" }],
  },
  {
    id: "catB", nombre: "Catering simple", grupoOpcion: "Catering", elegido: false,
    lineas: [{ cantidad: 100, costoUnitario: 30, precioUnitario: 50, moneda: "ARS", canalPago: "EFECTIVO" }],
  },
];

const totales = totalesPorSector(sectores);
const resumen = resumenPresupuesto(totales);

check("base suma solo sectores sin grupo", resumen.base.ARS, 2900);
check("total plano suma todo, incluso alternativas", resumen.totalPlano.ARS, 15900);
check("total vigente = base + alternativa elegida", resumen.totalVigente.ARS, 10900);
check("detecta que hay opciones", resumen.hayOpciones, true);
check("arma un grupo de alternativas", resumen.grupos.length, 1);
check("total con base de la opción elegida", resumen.grupos[0].opciones[0].totalConBase.ARS, 10900);
check("total con base de la opción descartada", resumen.grupos[0].opciones[1].totalConBase.ARS, 7900);

// ── Reparto por canal (la plata a juntar) ──────────────────────────
const reparto = repartoPorCanal(sectores);
check("efectivo solo de sectores vigentes", reparto.EFECTIVO.ARS, 1000);
check("transferencia", reparto.TRANSFERENCIA.ARS, 500);
check("a definir se muestra aparte", reparto.A_DEFINIR.ARS, 5000);
check("alternativa descartada NO entra al reparto", reparto.EFECTIVO.ARS, 1000);

// ── Margen ─────────────────────────────────────────────────────────
const m = margenPresupuesto(totales);
check("costo vigente", m.costo.ARS, 6500);
check("cliente vigente", m.cliente.ARS, 10900);
check("margen vigente", m.margen.ARS, 4400);
check("margen %", Math.round(m.margenPct ?? -1), 40);

// ── Moneda ─────────────────────────────────────────────────────────
const conUsd = totalesPorSector([
  { id: "s", nombre: "Mixto", grupoOpcion: null, elegido: false, lineas: [
    { cantidad: 1, costoUnitario: 10, precioUnitario: 20, moneda: "USD", canalPago: "EFECTIVO" },
    { cantidad: 1, costoUnitario: 100, precioUnitario: 200, moneda: "ARS", canalPago: "EFECTIVO" },
  ]},
]);
check("no mezcla monedas: ARS", conUsd[0].cliente.ARS, 200);
check("no mezcla monedas: USD", conUsd[0].cliente.USD, 20);

// ── Estado de pagos ────────────────────────────────────────────────
check("sin pagos = pendiente", estadoDePago(1000, 0), "PENDIENTE");
check("pago parcial", estadoDePago(1000, 400), "PARCIAL");
check("pago completo", estadoDePago(1000, 1000), "PAGADO");
check("tolerancia de centavos", estadoDePago(1000, 999.995), "PAGADO");

const lineasPago: LineaParaPago[] = [
  { id: "l1", item: "Mesas", sectorNombre: "Amb.", sectorGrupoOpcion: null, sectorElegido: false,
    cantidad: 10, costoUnitario: 100, moneda: "ARS", canalPago: "EFECTIVO",
    proveedorId: "p1", proveedorNombre: "Alquileres SA", deshabilitado: false },
  { id: "l2", item: "Sillas", sectorNombre: "Amb.", sectorGrupoOpcion: null, sectorElegido: false,
    cantidad: 1, costoUnitario: 500, moneda: "ARS", canalPago: "TRANSFERENCIA",
    proveedorId: "p1", proveedorNombre: "Alquileres SA", deshabilitado: false },
  { id: "l3", item: "Descartado", sectorNombre: "Opt B", sectorGrupoOpcion: "Catering", sectorElegido: false,
    cantidad: 100, costoUnitario: 30, moneda: "ARS", canalPago: "EFECTIVO",
    proveedorId: "p2", proveedorNombre: "Cocina", deshabilitado: false },
  { id: "l4", item: "Anulado", sectorNombre: "Amb.", sectorGrupoOpcion: null, sectorElegido: false,
    cantidad: 5, costoUnitario: 999, moneda: "ARS", canalPago: "EFECTIVO",
    proveedorId: "p1", proveedorNombre: "Alquileres SA", deshabilitado: true },
];

const grupos = agruparPagosPorProveedor(lineasPago, [
  { proveedorId: "p1", monto: 600, moneda: "ARS" },
]);

check("agrupa por proveedor y descarta alternativas/anulados", grupos.length, 1);
check("comprometido del proveedor", grupos[0].comprometido.ARS, 1500);
check("pagado del proveedor", grupos[0].pagado.ARS, 600);
check("pendiente del proveedor", grupos[0].pendiente.ARS, 900);
check("avance %", Math.round(grupos[0].avance ?? -1), 40);
check("estado parcial", grupos[0].estado, "PARCIAL");
check("reparto por canal del grupo", grupos[0].canales.EFECTIVO, 1000);
check("línea deshabilitada fuera del grupo", grupos[0].lineas.length, 2);

const tp = totalesPagos(grupos);
check("totales de pagos: comprometido", tp.comprometido, 1500);
check("totales de pagos: falta", tp.pendiente, 900);

// ── Validación de entrada ──────────────────────────────────────────
check("importe con 2 decimales", parseImporte("10.12"), 10.12);
check("rechaza 3 decimales", parseImporte("1.005"), null);
check("rechaza negativo", parseImporte("-5"), null);
check("rechaza texto", parseImporte("100abc"), null);
check("canal válido", esCanalPagoValido("A_DEFINIR"), true);
check("canal inválido se rechaza en API", esCanalPagoValido("CHEQUE"), false);
check("canal desconocido se normaliza al render", aCanalPago("CHEQUE"), "EFECTIVO");

const vOk = validarLinea({ item: "Mesa", cantidad: 2, costoUnitario: 100, precioUnitario: 150 });
check("línea válida pasa", vOk.ok, true);
check("cantidad cero se rechaza", validarLinea({ item: "x", cantidad: 0 }).ok, false);
check("item vacío se rechaza", validarLinea({ item: "  " }).ok, false);
check("moneda inválida se rechaza", validarLinea({ item: "x", moneda: "EUR" }).ok, false);

console.log(fallos === 0 ? "\nTodo OK" : `\n${fallos} fallas`);
process.exit(fallos === 0 ? 0 : 1);
