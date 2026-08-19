import {
  esTipoIngresoValido,
  etiquetasIngresos,
  normalizarTipoIngreso,
  proximoNumeroDePago,
} from "../src/lib/ingresos";

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

const d = (dia: number) => new Date(2026, 0, dia);

// Caso típico: seña, anticipo y tres pagos cargados fuera de orden.
const ingresos = [
  { id: "p2", tipo: "PAGO", fecha: d(20) },
  { id: "sena", tipo: "SENA", fecha: d(1) },
  { id: "p3", tipo: "PAGO", fecha: d(30) },
  { id: "ant", tipo: "ANTICIPO", fecha: d(5) },
  { id: "p1", tipo: "PAGO", fecha: d(10) },
];

const etq = etiquetasIngresos(ingresos);
check("seña no se numera", etq.get("sena"), "Seña");
check("anticipo no se numera", etq.get("ant"), "Anticipo");
check("primer pago por fecha", etq.get("p1"), "Pago 1");
check("segundo pago por fecha", etq.get("p2"), "Pago 2");
check("tercer pago por fecha", etq.get("p3"), "Pago 3");
check("proximo numero de pago", proximoNumeroDePago(ingresos), 4);

// Un solo pago: no tiene sentido llamarlo "Pago 1".
const unico = [{ id: "x", tipo: "PAGO", fecha: d(3) }];
check("pago único va sin número", etiquetasIngresos(unico).get("x"), "Pago");
check("proximo pago cuando hay uno", proximoNumeroDePago(unico), 2);

// Datos previos a la migración deben seguir leyéndose.
const legado = [
  { id: "f", tipo: "FACTURACION", fecha: d(2) },
  { id: "pp", tipo: "PAGO_PARCIAL", fecha: d(8) },
];
check("FACTURACION legado se lee como pago", normalizarTipoIngreso("FACTURACION"), "PAGO");
check("PAGO_PARCIAL legado se lee como pago", normalizarTipoIngreso("PAGO_PARCIAL"), "PAGO");
check("legados se numeran entre sí", etiquetasIngresos(legado).get("pp"), "Pago 2");

// Empate de fecha: el orden debe ser estable, no aleatorio.
const empate = [
  { id: "b", tipo: "PAGO", fecha: d(7) },
  { id: "a", tipo: "PAGO", fecha: d(7) },
];
check("empate de fecha ordena estable", [
  etiquetasIngresos(empate).get("a"),
  etiquetasIngresos(empate).get("b"),
], ["Pago 1", "Pago 2"]);

// Validación de entrada de la API.
check("acepta SENA", esTipoIngresoValido("SENA"), true);
check("acepta PAGO", esTipoIngresoValido("PAGO"), true);
check("rechaza FACTURACION (ya no existe)", esTipoIngresoValido("FACTURACION"), false);
check("rechaza string arbitrario", esTipoIngresoValido("CUALQUIERA"), false);
check("rechaza no-string", esTipoIngresoValido(42), false);

console.log(fallos === 0 ? "\nTodo OK" : `\n${fallos} fallas`);
process.exit(fallos === 0 ? 0 : 1);
