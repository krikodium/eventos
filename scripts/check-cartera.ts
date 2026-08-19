import {
  construirCarteraEventos,
  etiquetaAvanceCartera,
  fetchCarteraEventos,
  filtrarCartera,
  sumarMovimientosEnArs,
  sumarImportesArsSeguro,
  totalesCartera,
  type EventoCartera,
  type FiltrosCartera,
} from "../src/lib/cartera-eventos";
import {
  parseMontoPositivo,
  parseTipoCambioUsd,
  resolverMetodoPago,
} from "../src/lib/metodos-pago";
import { puedeVerFinanzas } from "../src/lib/acceso-finanzas";
import {
  convertirFilasMonedaReporte,
  filtrarEventosComparables,
  idsEventosSinTipoCambio,
} from "../src/lib/reportes-financieros";

const hoy = new Date(2026, 7, 18); // 18-ago-2026, fijo para que no dependa del día

const base = {
  organizadora: null,
  tipoCambioUsd: null,
  egresos: 0, proveedores: 0, utileros: 0, cajaChica: 0, resultado: 0, margen: null,
  movimientosUsdSinTipoCambio: 0,
};

const eventos: EventoCartera[] = [
  { ...base, id: "a", nombre: "Cena anual Ternium", cliente: "Grupo Ternium", organizadora: "Azares",
    fecha: new Date(2026, 7, 18).toISOString(), estado: "CONFIRMADO", tipo: "CORPORATIVO",
    presupuesto: 5_000_000, cobrado: 1_500_000, porCobrar: 3_500_000, avance: 30 },
  { ...base, id: "b", nombre: "Casamiento Pereyra", cliente: "Flia. Pereyra",
    fecha: new Date(2026, 6, 9).toISOString(), estado: "FACTURADO", tipo: "PARTICULAR",
    presupuesto: 2_000_000, cobrado: 2_000_000, porCobrar: 0, avance: 100 },
  { ...base, id: "c", nombre: "Lanzamiento", cliente: "Cliente X",
    fecha: new Date(2026, 7, 28).toISOString(), estado: "BORRADOR", tipo: "CORPORATIVO",
    presupuesto: 0, cobrado: 0, porCobrar: 0, avance: null },
];

const F: FiltrosCartera = {
  busqueda: "", estado: "todos", tipo: "todos",
  cobranza: "todos", periodo: "todos", orden: "fecha",
};

let fallos = 0;
function check(nombre: string, real: unknown, esperado: unknown) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) fallos++;
  console.log(`${ok ? "OK  " : "FALLA"} ${nombre}${ok ? "" : `\n      esperado ${JSON.stringify(esperado)}\n      obtuve   ${JSON.stringify(real)}`}`);
}

function checkThrows(nombre: string, accion: () => unknown) {
  let lanzo = false;
  try {
    accion();
  } catch {
    lanzo = true;
  }
  check(nombre, lanzo, true);
}

const ids = (f: Partial<FiltrosCartera>) =>
  filtrarCartera(eventos, { ...F, ...f }, hoy).map((e) => e.id);

check("sin filtros ordena por fecha desc", ids({}), ["c", "a", "b"]);
check("cobranza: con saldo", ids({ cobranza: "saldo" }), ["a"]);
check("cobranza: saldados", ids({ cobranza: "saldados" }), ["b"]);
check("cobranza: sin presupuesto", ids({ cobranza: "sin-presupuesto" }), ["c"]);
check("periodo: este mes", ids({ periodo: "mes" }), ["c", "a"]);
check("periodo: proximos (incluye hoy)", ids({ periodo: "proximos" }), ["c", "a"]);
check("periodo: pasados", ids({ periodo: "pasados" }), ["b"]);
check("estado: FACTURADO", ids({ estado: "FACTURADO" }), ["b"]);
check("tipo: PARTICULAR", ids({ tipo: "PARTICULAR" }), ["b"]);
check("busqueda por organizadora", ids({ busqueda: "azares" }), ["a"]);
check("busqueda por cliente, sin acento-sensibilidad", ids({ busqueda: "pereyra" }), ["b"]);
check("orden por mayor saldo", ids({ orden: "porCobrar" }), ["a", "b", "c"]);
check("orden por menor avance", ids({ orden: "avance" }), ["a", "b", "c"]);

const t = totalesCartera(eventos);
check("totales: presupuestado", t.presupuesto, 7_000_000);
check("totales: cobrado", t.cobrado, 3_500_000);
check("totales: por cobrar", t.porCobrar, 3_500_000);
check("totales: avance %", Math.round(t.avance ?? -1), 50);

const soloSaldo = totalesCartera(filtrarCartera(eventos, { ...F, cobranza: "saldo" }, hoy));
check("totales recalculan al filtrar: eventos", soloSaldo.eventos, 1);
check("totales recalculan al filtrar: presupuestado", soloSaldo.presupuesto, 5_000_000);
check("totales recalculan al filtrar: cobrado", soloSaldo.cobrado, 1_500_000);

const mezcla = sumarMovimientosEnArs(
  [
    { monto: 100, metodoPago: "TRANSF_ARS" },
    { monto: 2.5, metodoPago: "EFECTIVO_USD" },
  ],
  1_200
);
check("convierte USD a ARS antes de sumar", mezcla.totalArs, 3_100);
check("con TC no quedan movimientos pendientes", mezcla.movimientosUsdSinTipoCambio, 0);

const carteraMonedas = construirCarteraEventos({
  eventos: [
    {
      id: "con-tc", nombre: "Con TC", cliente: "A", organizadora: null,
      fecha: hoy, estado: "CONFIRMADO", tipo: "CORPORATIVO",
      presupuestoTotal: 10_000, tipoCambioUsd: 1_000,
    },
    {
      id: "sin-tc", nombre: "Sin TC", cliente: "B", organizadora: null,
      fecha: hoy, estado: "CONFIRMADO", tipo: "CORPORATIVO",
      presupuestoTotal: 20_000, tipoCambioUsd: null,
    },
  ],
  ingresos: [
    { eventoId: "con-tc", monto: 2, metodoPago: "TRANSF_USD" },
    { eventoId: "con-tc", monto: 500, metodoPago: "TRANSF_ARS" },
    { eventoId: "sin-tc", monto: 3, metodoPago: "EFECTIVO_USD" },
    { eventoId: "sin-tc", monto: 700, metodoPago: "EFECTIVO_ARS" },
  ],
  proveedores: [
    { eventoId: "con-tc", monto: 1, metodoPago: "TRANSF_USD" },
    { eventoId: "sin-tc", monto: 4, metodoPago: "TRANSF_USD" },
  ],
  utileros: [{ eventoId: "con-tc", total: 250 }],
  cajaChica: [
    { eventoId: "con-tc", monto: 0.5, metodoPago: "EFECTIVO_USD", sentido: "EGRESO" },
    { eventoId: "con-tc", monto: 99, metodoPago: "EFECTIVO_ARS", sentido: "INGRESO" },
    { eventoId: "sin-tc", monto: 5, metodoPago: "EFECTIVO_USD", sentido: "EGRESO" },
  ],
});

const conTc = carteraMonedas.find((evento) => evento.id === "con-tc")!;
const sinTc = carteraMonedas.find((evento) => evento.id === "sin-tc")!;
check("ingresos USD y ARS quedan expresados en ARS", conTc.cobrado, 2_500);
check("proveedores USD se convierten con tipoCambioUsd", conTc.proveedores, 1_000);
check("caja USD se convierte y solo suma egresos", conTc.cajaChica, 500);
check("egresos combinan proveedores, utileros y caja en ARS", conTc.egresos, 1_750);
check("evento sin TC cuenta todos sus movimientos USD", sinTc.movimientosUsdSinTipoCambio, 3);
check("evento sin TC no mezcla USD con ARS en cobrado", sinTc.cobrado, 700);
check("evento sin TC no calcula saldo incompatible", sinTc.porCobrar, null);
check("evento sin TC no calcula resultado incompatible", sinTc.resultado, null);

const totalesMonedas = totalesCartera(carteraMonedas);
check("totales excluyen eventos sin TC", totalesMonedas.eventosComparables, 1);
check("totales señalan eventos sin TC", totalesMonedas.eventosSinTipoCambio, 1);
check("totales monetarios no incluyen parciales sin TC", totalesMonedas.presupuesto, 10_000);

const tcCero = sumarMovimientosEnArs([{ monto: 1, metodoPago: "TRANSF_USD" }], 0);
check("TC cero se trata como conversión pendiente", tcCero.movimientosUsdSinTipoCambio, 1);
check("TC cero no suma el nominal USD como ARS", tcCero.totalArs, 0);
check("redondea cada conversión a centavos ARS", sumarMovimientosEnArs([
  { monto: 0.01, metodoPago: "TRANSF_USD" },
], 1.555).totalArs, 0.02);
check("suma importes ARS sin deriva binaria", sumarImportesArsSeguro([0.1, 0.2]), 0.3);
checkThrows("rechaza overflow acumulado en reportes", () =>
  sumarImportesArsSeguro([90_071_992_547_409, 1])
);
checkThrows("rechaza método de pago desconocido", () =>
  sumarMovimientosEnArs([{ monto: 100, metodoPago: "TRANSFER" }], 1_000)
);
checkThrows("rechaza monto NaN almacenado", () =>
  sumarMovimientosEnArs([{ monto: Number.NaN, metodoPago: "TRANSF_ARS" }], null)
);
checkThrows("rechaza monto infinito almacenado", () =>
  sumarMovimientosEnArs([{ monto: Number.POSITIVE_INFINITY, metodoPago: "TRANSF_ARS" }], null)
);
checkThrows("rechaza overflow al convertir USD a centavos ARS", () =>
  sumarMovimientosEnArs(
    [{ monto: 90_071_992_547_409.91, metodoPago: "TRANSF_USD" }],
    1_200
  )
);
check("API rechaza parseo parcial de monto", parseMontoPositivo("100abc"), null);
check("API rechaza monto infinito", parseMontoPositivo("Infinity"), null);
check("API acepta monto exacto de dos decimales", parseMontoPositivo("10.12"), 10.12);
check("API rechaza montos con más de dos decimales", parseMontoPositivo("1.005"), null);
check("API rechaza método arbitrario", resolverMetodoPago("TRANSFER", "TRANSF_ARS"), null);
check("API acepta TC decimal completo", parseTipoCambioUsd("1200.123456"), 1200.123456);
check("API rechaza TC con parseo parcial", parseTipoCambioUsd("1200abc"), null);
check("API rechaza TC infinito", parseTipoCambioUsd("Infinity"), null);
check("API rechaza TC negativo", parseTipoCambioUsd("-1200"), null);
check("evento con presupuesto y TC pendiente se etiqueta Falta TC", etiquetaAvanceCartera(sinTc), "Falta TC");
check("Mateo puede ver Finanzas", puedeVerFinanzas({ email: "gestion@hermanascaradonti.com" }), true);
check("Arturo puede ver Finanzas", puedeVerFinanzas({ email: "pagos@hermanascaradonti.com" }), true);
check("Graciela puede ver Finanzas", puedeVerFinanzas({ email: "administracion@hermanascaradonti.com" }), true);
check("otro administrador no hereda acceso financiero", puedeVerFinanzas({ email: "lola@hermanascaradonti.com" }), false);
check("acceso financiero normaliza mayúsculas", puedeVerFinanzas({ email: "  PAGOS@HERMANASCARADONTI.COM " }), true);

const filasReporte = convertirFilasMonedaReporte([
  {
    eventoId: "reporte-con-tc",
    monto: 2,
    metodoPago: "TRANSF_USD",
    evento: { nombre: "Reporte con TC", tipoCambioUsd: 1_100 },
  },
  {
    eventoId: "reporte-sin-tc",
    monto: 3,
    metodoPago: "EFECTIVO_USD",
    evento: { nombre: "Reporte sin TC", tipoCambioUsd: null },
  },
]);
check("reportes convierten USD a ARS", filasReporte[0].montoArs, 2_200);
const idsSinTcReporte = idsEventosSinTipoCambio([filasReporte]);
check("reportes detectan evento sin TC", idsSinTcReporte.has("reporte-sin-tc"), true);
check(
  "reportes excluyen por completo eventos sin TC",
  filtrarEventosComparables(
    [
      { eventoId: "reporte-con-tc", monto: 100 },
      { eventoId: "reporte-sin-tc", monto: 500 },
    ],
    idsSinTcReporte
  ).map((fila) => fila.eventoId),
  ["reporte-con-tc"]
);

void (async () => {
  const errorEsperado = new Error("fallo proveedor");
  let errorPropagado: unknown;
  try {
    await fetchCarteraEventos(async () => {
      throw errorEsperado;
    });
  } catch (error) {
    errorPropagado = error;
  }
  check("fetch propaga el error y nunca devuelve cartera vacía", errorPropagado, errorEsperado);

  console.log(fallos === 0 ? "\nTodo OK" : `\n${fallos} fallas`);
  process.exit(fallos === 0 ? 0 : 1);
})();
