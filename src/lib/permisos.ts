import type { Prisma } from "@prisma/client";

export const PERMISO_KEYS = [
  "navPresupuestos",
  "navProveedores",
  "navUtilerosCatalogo",
  "navReportes",
  "navUsuarios",
  "eventoVerResumenTarjetas",
  "eventoVerGraficoGastos",
  "eventoVerDetallePresupuestoCobros",
  "eventoVerTabIngresos",
  "eventoEditarTipoCambio",
  "eventoVerFlujoPesos",
  "cajaChicaVer",
  "cargaCompromisosProveedor",
  "verMovimientosProveedorDetalle",
  "registrarPagosProveedorMovimiento",
  "eliminarPagosProveedor",
  "planillaUtilerosAgregar",
  "planillaUtilerosEditarTareas",
  "planillaUtilerosEditarDiasArmado",
  "planillaUtilerosVerPagosDetalle",
] as const;

export type EventosPermisoKey = (typeof PERMISO_KEYS)[number];
export type EventosPermisos = Record<EventosPermisoKey, boolean>;

const ALL_TRUE = Object.fromEntries(PERMISO_KEYS.map((k) => [k, true])) as EventosPermisos;

/** Comportamiento histórico de usuarios no admin (VENDEDOR / VIEWER) antes de permisos granulares. */
const LEGACY_NO_ADMIN: EventosPermisos = {
  navPresupuestos: true,
  navProveedores: false,
  navUtilerosCatalogo: false,
  navReportes: false,
  navUsuarios: false,
  eventoVerResumenTarjetas: true,
  eventoVerGraficoGastos: true,
  eventoVerDetallePresupuestoCobros: true,
  eventoVerTabIngresos: true,
  eventoEditarTipoCambio: false,
  eventoVerFlujoPesos: true,
  cajaChicaVer: true,
  cargaCompromisosProveedor: false,
  verMovimientosProveedorDetalle: true,
  registrarPagosProveedorMovimiento: true,
  eliminarPagosProveedor: true,
  planillaUtilerosAgregar: false,
  planillaUtilerosEditarTareas: false,
  planillaUtilerosEditarDiasArmado: false,
  planillaUtilerosVerPagosDetalle: true,
};

/** Perfil operativo (ej. cotizaciones, caja chica, utileros sin ver finanzas ni presupuestos). */
export const PRESET_OPERATIVO_EVENTOS: EventosPermisos = {
  navPresupuestos: false,
  navProveedores: false,
  navUtilerosCatalogo: false,
  navReportes: false,
  navUsuarios: false,
  eventoVerResumenTarjetas: false,
  eventoVerGraficoGastos: false,
  eventoVerDetallePresupuestoCobros: false,
  eventoVerTabIngresos: false,
  eventoEditarTipoCambio: false,
  eventoVerFlujoPesos: false,
  cajaChicaVer: true,
  cargaCompromisosProveedor: true,
  verMovimientosProveedorDetalle: false,
  registrarPagosProveedorMovimiento: false,
  eliminarPagosProveedor: false,
  planillaUtilerosAgregar: true,
  planillaUtilerosEditarTareas: true,
  planillaUtilerosEditarDiasArmado: false,
  planillaUtilerosVerPagosDetalle: false,
};

export function resolvePermisos(
  role: string,
  stored: Prisma.JsonValue | null | undefined
): EventosPermisos {
  if (role === "ADMIN") {
    return { ...ALL_TRUE };
  }
  const base: EventosPermisos =
    role === "VIEWER" ? { ...LEGACY_NO_ADMIN, navPresupuestos: false } : { ...LEGACY_NO_ADMIN };

  if (stored && typeof stored === "object" && !Array.isArray(stored)) {
    const o = stored as Record<string, unknown>;
    for (const k of PERMISO_KEYS) {
      if (typeof o[k] === "boolean") {
        base[k] = o[k];
      }
    }
  }
  return base;
}

export function permisosLabels(): Record<EventosPermisoKey, string> {
  return {
    navPresupuestos: "Ver menú Presupuestos",
    navProveedores: "Ver menú Proveedores",
    navUtilerosCatalogo: "Ver menú Utileros (catálogo)",
    navReportes: "Ver menú Reportes",
    navUsuarios: "Ver menú Usuarios",
    eventoVerResumenTarjetas: "Evento: tarjetas resumen (ingresos/egresos/balance)",
    eventoVerGraficoGastos: "Evento: gráfico de gastos",
    eventoVerDetallePresupuestoCobros: "Evento: detalle presupuesto y cobros al cliente",
    eventoVerTabIngresos: "Evento: pestaña Ingresos",
    eventoEditarTipoCambio: "Evento: editar tipo de cambio USD",
    eventoVerFlujoPesos: "Evento: ver flujo en pesos",
    cajaChicaVer: "Evento: caja chica (ver y cargar)",
    cargaCompromisosProveedor: "Proveedores: cargar cotizaciones / compromisos de pago",
    verMovimientosProveedorDetalle: "Proveedores: ver cada pago registrado (movimientos)",
    registrarPagosProveedorMovimiento: "Proveedores: registrar pagos (movimientos)",
    eliminarPagosProveedor: "Proveedores: eliminar registros",
    planillaUtilerosAgregar: "Utileros: agregar filas / tareas al evento",
    planillaUtilerosEditarTareas: "Utileros: editar montos de tareas",
    planillaUtilerosEditarDiasArmado: "Utileros: cambiar días de armado",
    planillaUtilerosVerPagosDetalle: "Utileros: ver anticipo, transferencia y efectivo",
  };
}
