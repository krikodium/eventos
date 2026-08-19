import { validarLote } from "../src/lib/movimientos-lote";

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

const okFila = (extra: Record<string, unknown>) => ({
  monto: "100", metodoPago: "TRANSF_ARS", fecha: "2026-08-19", ...extra,
});

// ── Lote válido mixto ──────────────────────────────────────────────
const mixto = validarLote([
  okFila({ tipo: "INGRESO", tipoIngreso: "SENA" }),
  okFila({ tipo: "PROVEEDOR", proveedorId: "p1", rubroId: "r1" }),
  okFila({ tipo: "CAJA", empleadaEncargada: "Ana", sentido: "EGRESO" }),
  { tipo: "UTILERO", utileroId: "u1", tipoTarea: "ARMADO", dias: 2, monto: "5000" },
]);
check("acepta lote mixto", mixto.ok, true);
check("mantiene las 4 filas", mixto.ok && mixto.movimientos.length, 4);

// ── Una fila mala invalida TODO el lote ────────────────────────────
const conMala = validarLote([
  okFila({ tipo: "INGRESO", tipoIngreso: "PAGO" }),
  okFila({ tipo: "INGRESO", tipoIngreso: "PAGO", monto: "-50" }),
]);
check("una fila mala rechaza el lote entero", conMala.ok, false);
check("indica el número de fila", !conMala.ok && conMala.fila, 2);

// ── Validaciones puntuales ─────────────────────────────────────────
check("rechaza lote vacío", validarLote([]).ok, false);
check("rechaza no-array", validarLote("nada").ok, false);
check("rechaza más de 50 filas", validarLote(
  Array.from({ length: 51 }, () => okFila({ tipo: "INGRESO" }))
).ok, false);
check("acepta exactamente 50", validarLote(
  Array.from({ length: 50 }, () => okFila({ tipo: "INGRESO" }))
).ok, true);

check("rechaza monto cero", validarLote([okFila({ tipo: "INGRESO", monto: "0" })]).ok, false);
check("rechaza monto con 3 decimales", validarLote([okFila({ tipo: "INGRESO", monto: "1.005" })]).ok, false);
check("rechaza monto no numérico", validarLote([okFila({ tipo: "INGRESO", monto: "abc" })]).ok, false);
check("rechaza método inventado", validarLote([okFila({ tipo: "INGRESO", metodoPago: "CHEQUE" })]).ok, false);
check("rechaza tipo de cobro inválido", validarLote([okFila({ tipo: "INGRESO", tipoIngreso: "FACTURACION" })]).ok, false);
check("rechaza fecha inválida", validarLote([okFila({ tipo: "INGRESO", fecha: "no-es-fecha" })]).ok, false);
check("rechaza tipo de movimiento desconocido", validarLote([okFila({ tipo: "OTRA_COSA" })]).ok, false);

check("proveedor sin id se rechaza", validarLote([okFila({ tipo: "PROVEEDOR", rubroId: "r1" })]).ok, false);
check("proveedor sin rubro se rechaza", validarLote([okFila({ tipo: "PROVEEDOR", proveedorId: "p1" })]).ok, false);
check("caja sin encargada se rechaza", validarLote([okFila({ tipo: "CAJA" })]).ok, false);
check("utilero sin id se rechaza", validarLote([{ tipo: "UTILERO", monto: "100", dias: 1 }]).ok, false);
check("tarea inválida se rechaza", validarLote([
  { tipo: "UTILERO", utileroId: "u1", tipoTarea: "INVENTADA", dias: 1, monto: "100" },
]).ok, false);
check("días cero se rechaza", validarLote([
  { tipo: "UTILERO", utileroId: "u1", tipoTarea: "EVENTO", dias: 0, monto: "100" },
]).ok, false);

// ── Defaults sensatos ──────────────────────────────────────────────
const conDefaults = validarLote([{ tipo: "INGRESO", monto: "500" }]);
check("método por defecto es transferencia ARS",
  conDefaults.ok && conDefaults.movimientos[0].tipo === "INGRESO" && conDefaults.movimientos[0].metodoPago,
  "TRANSF_ARS");
check("tipo de cobro por defecto es PAGO",
  conDefaults.ok && conDefaults.movimientos[0].tipo === "INGRESO" && conDefaults.movimientos[0].tipoIngreso,
  "PAGO");

const cajaDefault = validarLote([okFila({ tipo: "CAJA", empleadaEncargada: "Ana" })]);
check("caja por defecto es egreso",
  cajaDefault.ok && cajaDefault.movimientos[0].tipo === "CAJA" && cajaDefault.movimientos[0].sentido,
  "EGRESO");

console.log(fallos === 0 ? "\nTodo OK" : `\n${fallos} fallas`);
process.exit(fallos === 0 ? 0 : 1);
