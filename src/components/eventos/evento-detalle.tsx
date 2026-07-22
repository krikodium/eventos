"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PagosProveedores } from "./pagos-proveedores";
import { PlanillaUtileros } from "./planilla-utileros";
import { CajaChicaForm } from "./caja-chica-form";
import { IngresoForm } from "./ingreso-form";
import { CompromisosProveedorEmpleado, type CompromisoResumen } from "./compromisos-proveedor-empleado";
import type { EventosPermisos } from "@/lib/permisos";
import { esMovimientoPago } from "@/lib/pagos-proveedor-utils";
import { cajaSentidoEsEgreso } from "@/lib/caja-chica-pesos";

type Evento = {
  id: string;
  fecha: Date;
  tipoCambioUsd?: number | null;
  pagosProveedores: Array<{
    id: string;
    monto: number;
    fecha: Date;
    concepto: string | null;
    metodoPago: string;
    rol?: string;
    compromisoId?: string | null;
    proveedor: { nombre: string };
    rubro: { nombre: string };
  }>;
  diasUtileros: Array<{
    id: string;
    dias: number;
    monto: number;
    tipo?: string;
    utileroId: string;
    utilero: { id: string; nombre: string };
  }>;
  utilerosEnEvento?: Array<{
    id: string;
    utileroId: string;
    anticipo: number;
    montoTransferencia: number | null;
    montoEfectivo: number | null;
  }>;
  diasArmado?: number;
  cajaChica?: Array<{
    id: string;
    monto: number;
    metodoPago?: string;
    sentido?: string | null;
    empleadaEncargada: string;
    concepto: string | null;
    fecha: Date;
  }>;
  ingresos: Array<{
    id: string;
    monto: number;
    metodoPago?: string;
    concepto: string | null;
    fecha: Date;
    tipo: string;
    numeroFactura: string | null;
  }>;
};

function montoEnPesos(monto: number, metodo: string | undefined, tc: number): number {
  if (!metodo || !tc) return monto;
  return metodo.endsWith("_USD") ? monto * tc : monto;
}

type TabId = "pagos" | "utileros" | "caja" | "ingresos";

type Props = {
  evento: Evento;
  permisos: EventosPermisos;
  compromisosResumen: CompromisoResumen[];
  isAdmin: boolean;
  nombreUsuario: string;
};

export function EventoDetalle({ evento, permisos, compromisosResumen, isAdmin, nombreUsuario }: Props) {
  const router = useRouter();

  const verPagos =
    permisos.cargaCompromisosProveedor ||
    permisos.verMovimientosProveedorDetalle ||
    permisos.registrarPagosProveedorMovimiento;

  const soloVistaCompromisos =
    permisos.cargaCompromisosProveedor &&
    !permisos.verMovimientosProveedorDetalle &&
    !permisos.registrarPagosProveedorMovimiento;

  const verUtileros =
    permisos.planillaUtilerosAgregar ||
    permisos.planillaUtilerosEditarTareas ||
    permisos.planillaUtilerosVerPagosDetalle;

  const verCaja = permisos.cajaChicaVer;
  const verIngresos = permisos.eventoVerTabIngresos;

  const tabs = useMemo(() => {
    const out: { id: TabId; label: string; count: number }[] = [];
    if (verPagos) {
      out.push({
        id: "pagos",
        label: soloVistaCompromisos ? "Cotizaciones proveedores" : "Pagos a proveedores",
        count: soloVistaCompromisos ? compromisosResumen.length : evento.pagosProveedores.length,
      });
    }
    if (verUtileros) {
      out.push({ id: "utileros", label: "Utileros", count: evento.diasUtileros.length });
    }
    if (verCaja) {
      out.push({ id: "caja", label: "Caja chica", count: evento.cajaChica?.length ?? 0 });
    }
    if (verIngresos) {
      out.push({ id: "ingresos", label: "Ingresos", count: evento.ingresos.length });
    }
    return out;
  }, [
    verPagos,
    soloVistaCompromisos,
    verUtileros,
    verCaja,
    verIngresos,
    compromisosResumen.length,
    evento.pagosProveedores.length,
    evento.diasUtileros.length,
    evento.cajaChica?.length,
    evento.ingresos.length,
  ]);

  const firstTab = tabs[0]?.id ?? "pagos";
  const [tabSel, setTabSel] = useState<TabId | null>(null);
  const tabActivo: TabId =
    tabSel != null && tabs.some((t) => t.id === tabSel) ? tabSel : firstTab;

  async function handleDiasArmadoChange(dias: number) {
    try {
      await fetch(`/api/eventos/${evento.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diasArmado: dias }),
      });
      router.refresh();
    } catch (err) {
      console.error(err);
    }
  }

  const METODOS_PAGO: Record<string, string> = {
    EFECTIVO_USD: "Efectivo USD",
    EFECTIVO_ARS: "Efectivo ARS",
    TRANSF_ARS: "Transf. ARS",
    TRANSF_USD: "Transf. USD",
  };
  const tiposIngreso: Record<string, string> = {
    FACTURACION: "Facturación",
    ANTICIPO: "Anticipo",
    PAGO_PARCIAL: "Pago parcial",
  };

  const [verEnPesos, setVerEnPesos] = useState(false);
  const tc = evento.tipoCambioUsd ?? 0;

  const pagosMovimiento = evento.pagosProveedores.filter(esMovimientoPago);
  const mostrarBloqueTc =
    permisos.eventoEditarTipoCambio || (permisos.eventoVerFlujoPesos && tc > 0);

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-neutral-100">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-600">Registro operativo</p>
            <h2 className="text-lg font-semibold tracking-tight text-neutral-900">Movimientos del evento</h2>
            <p className="text-neutral-500 text-sm mt-0.5">
              {verPagos && verUtileros && verCaja && verIngresos
                ? "Pagos, utileros, caja chica e ingresos"
                : "Información según tu perfil de acceso"}
            </p>
          </div>
          {mostrarBloqueTc && (
            <div className="flex items-center gap-3">
              {permisos.eventoEditarTipoCambio && (
                <EditorTipoCambioUsd
                  key={String(evento.tipoCambioUsd ?? "")}
                  eventoId={evento.id}
                  tipoCambioUsd={evento.tipoCambioUsd}
                />
              )}
              {permisos.eventoVerFlujoPesos && tc > 0 && (
                <button
                  type="button"
                  onClick={() => setVerEnPesos(!verEnPesos)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    verEnPesos
                      ? "bg-neutral-900 text-white border-neutral-900"
                      : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-100"
                  }`}
                >
                  {verEnPesos ? "Flujo en pesos ✓" : "Ver flujo en pesos"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="border-b border-neutral-100 px-4 py-4 sm:px-6">
        <div className="inline-flex max-w-full flex-wrap gap-1 rounded-xl bg-neutral-100 p-1">
          {tabs.map((t) => {
            const activo = tabActivo === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTabSel(t.id)}
                className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  activo ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-800"
                }`}
              >
                {t.label}
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
                    activo ? "bg-neutral-900 text-white" : "bg-neutral-200 text-neutral-600"
                  }`}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {permisos.eventoVerFlujoPesos && verEnPesos && tc > 0 && (
        <div className="px-6 py-3 bg-neutral-100 border-b border-neutral-200">
          <p className="text-sm font-medium text-neutral-800">
            Flujo en pesos (TC: ${tc.toLocaleString("es-AR")}/USD) — Ingresos: $
            {evento.ingresos
              .reduce((s, i) => s + montoEnPesos(i.monto, i.metodoPago, tc), 0)
              .toLocaleString("es-AR")}{" "}
            | Egresos: $
            {(
              pagosMovimiento.reduce((s, p) => s + montoEnPesos(p.monto, p.metodoPago, tc), 0) +
              (evento.cajaChica ?? []).reduce((s, c) => {
                if (!cajaSentidoEsEgreso(c.sentido)) return s;
                return s + montoEnPesos(c.monto, c.metodoPago, tc);
              }, 0) +
              evento.diasUtileros.reduce((s, d) => s + d.monto, 0)
            ).toLocaleString("es-AR")}
          </p>
        </div>
      )}

      <div className="p-6">
        {tabActivo === "pagos" && verPagos && (
          <>
            {soloVistaCompromisos ? (
              <CompromisosProveedorEmpleado
                eventoId={evento.id}
                items={compromisosResumen}
                puedeCargar={permisos.cargaCompromisosProveedor}
              />
            ) : (
              <PagosProveedores
                eventoId={evento.id}
                pagos={evento.pagosProveedores}
                puedeRegistrarMovimiento={permisos.registrarPagosProveedorMovimiento}
                puedeEliminar={permisos.eliminarPagosProveedor}
                puedeCargarCompromiso={permisos.cargaCompromisosProveedor}
              />
            )}
          </>
        )}

        {tabActivo === "utileros" && verUtileros && (
          <PlanillaUtileros
            eventoId={evento.id}
            fecha={evento.fecha}
            diasArmado={evento.diasArmado ?? 2}
            diasUtileros={evento.diasUtileros}
            utilerosEnEvento={evento.utilerosEnEvento ?? []}
            puedeEditarDiasArmado={permisos.planillaUtilerosEditarDiasArmado}
            puedeAgregarFilas={permisos.planillaUtilerosAgregar}
            puedeEditarMontosTarea={permisos.planillaUtilerosEditarTareas}
            puedeVerColumnasPago={permisos.planillaUtilerosVerPagosDetalle}
            onDiasArmadoChange={
              permisos.planillaUtilerosEditarDiasArmado ? handleDiasArmadoChange : undefined
            }
          />
        )}

        {tabActivo === "caja" && verCaja && (
          <div>
            {permisos.cajaChicaVer && (
              <CajaChicaForm
                eventoId={evento.id}
                tipoCambioUsd={evento.tipoCambioUsd}
                movimientos={evento.cajaChica ?? []}
                nombreUsuario={nombreUsuario}
                esAdmin={isAdmin}
              />
            )}
          </div>
        )}

        {tabActivo === "ingresos" && verIngresos && (
          <div>
            {isAdmin && <IngresoForm eventoId={evento.id} />}
            <div className="mt-6 space-y-2">
              {evento.ingresos.map((i) => (
                <div
                  key={i.id}
                  className="group relative flex items-start justify-between gap-4 overflow-hidden rounded-xl border border-neutral-200 bg-white px-4 py-3.5 transition-all hover:border-neutral-300 hover:shadow-sm"
                >
                  <span className="absolute inset-y-0 left-0 w-1 bg-emerald-500" />
                  <div className="pl-2.5">
                    <span className="font-semibold text-neutral-900">{tiposIngreso[i.tipo] ?? i.tipo}</span>
                    {i.concepto && <p className="mt-0.5 text-sm text-neutral-500">{i.concepto}</p>}
                    {i.numeroFactura && (
                      <p className="mt-0.5 text-xs text-neutral-500">Factura: {i.numeroFactura}</p>
                    )}
                    <p className="mt-1 text-xs text-neutral-400">
                      {new Date(i.fecha).toLocaleDateString("es-AR")} •{" "}
                      {METODOS_PAGO[i.metodoPago ?? ""] ?? i.metodoPago ?? "—"}
                    </p>
                  </div>
                  <span className="shrink-0 font-bold tabular-nums text-emerald-700">
                    +${i.monto.toLocaleString("es-AR")}
                  </span>
                </div>
              ))}
              {evento.ingresos.length === 0 && (
                <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/60 py-10 text-center">
                  <p className="text-sm text-neutral-500">
                    No hay ingresos registrados{!isAdmin && " (solo admins pueden cargar)"}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EditorTipoCambioUsd({
  eventoId,
  tipoCambioUsd,
}: {
  eventoId: string;
  tipoCambioUsd: number | null | undefined;
}) {
  const router = useRouter();
  const [tipoCambioInput, setTipoCambioInput] = useState(String(tipoCambioUsd ?? ""));
  return (
    <div className="flex items-center gap-2">
      <label className="text-neutral-600 text-sm">Tipo cambio USD</label>
      <input
        type="number"
        step="0.01"
        placeholder="Ej: 1200"
        value={tipoCambioInput}
        onChange={(e) => setTipoCambioInput(e.target.value)}
        onBlur={async () => {
          const v = tipoCambioInput ? parseFloat(tipoCambioInput) : null;
          try {
            await fetch(`/api/eventos/${eventoId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tipoCambioUsd: v }),
            });
            router.refresh();
          } catch (err) {
            console.error(err);
          }
        }}
        className="w-28 px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-200 focus:border-neutral-300"
      />
    </div>
  );
}
