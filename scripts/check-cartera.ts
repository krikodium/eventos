import {
  filtrarCartera,
  totalesCartera,
  type EventoCartera,
  type FiltrosCartera,
} from "../src/lib/cartera-eventos";

const hoy = new Date(2026, 7, 18); // 18-ago-2026, fijo para que no dependa del día

const base = {
  organizadora: null,
  egresos: 0, proveedores: 0, utileros: 0, cajaChica: 0, resultado: 0, margen: null,
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

console.log(fallos === 0 ? "\nTodo OK" : `\n${fallos} fallas`);
process.exit(fallos === 0 ? 0 : 1);
