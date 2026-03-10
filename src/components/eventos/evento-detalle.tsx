"use client";

import { useState } from "react";
import { PagoProveedorForm } from "./pago-proveedor-form";
import { DiaUtileroForm } from "./dia-utilero-form";
import { CajaChicaForm } from "./caja-chica-form";
import { IngresoForm } from "./ingreso-form";

type Evento = {
  id: string;
  pagosProveedores: Array<{
    id: string;
    monto: number;
    fecha: Date;
    concepto: string | null;
    metodoPago: string;
    proveedor: { nombre: string };
    rubro: { nombre: string };
  }>;
  diasUtileros: Array<{
    id: string;
    dias: number;
    monto: number;
    tipo?: string;
    utilero: { nombre: string; tarifaPorDia: number };
  }>;
  cajaChica?: Array<{
    id: string;
    monto: number;
    empleadaEncargada: string;
    concepto: string | null;
    fecha: Date;
  }>;
  ingresos: Array<{
    id: string;
    monto: number;
    concepto: string | null;
    fecha: Date;
    tipo: string;
    numeroFactura: string | null;
  }>;
};

type Props = {
  evento: Evento;
  isAdmin: boolean;
  totalIngresos: number;
  totalPagos: number;
  totalUtileros: number;
  totalCajaChica?: number;
};

const TIPOS_DIA: Record<string, string> = {
  ARMADO: "Armado",
  GUARDIA: "Guardia",
  EVENTO: "Día evento",
  DESARME_EVENTO: "Desarme evento",
  DESARME_DEPO: "Desarme depósito",
};

export function EventoDetalle({
  evento,
  isAdmin,
  totalIngresos,
  totalPagos,
  totalUtileros,
  totalCajaChica = 0,
}: Props) {
  const [tab, setTab] = useState<"pagos" | "utileros" | "caja" | "ingresos">("pagos");

  const metodos: Record<string, string> = {
    EFECTIVO: "Efectivo",
    TRANSFERENCIA: "Transferencia",
    CHEQUE: "Cheque",
    OTRO: "Otro",
  };
  const tiposIngreso: Record<string, string> = {
    FACTURACION: "Facturación",
    ANTICIPO: "Anticipo",
    PAGO_PARCIAL: "Pago parcial",
  };

  const tabs = [
    { id: "pagos" as const, label: "Pagos a proveedores", count: evento.pagosProveedores.length },
    { id: "utileros" as const, label: "Utileros", count: evento.diasUtileros.length },
    { id: "caja" as const, label: "Caja chica", count: evento.cajaChica?.length ?? 0 },
    { id: "ingresos" as const, label: "Ingresos", count: evento.ingresos.length },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-700 bg-slate-800">
        <h2 className="text-lg font-semibold text-white">Movimientos del evento</h2>
        <p className="text-slate-300 text-sm mt-0.5">
          Pagos, utileros, caja chica e ingresos
        </p>
      </div>

      <div className="flex border-b border-slate-200 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.id
                ? "text-sky-600 border-b-2 border-sky-600 bg-sky-50/30"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50/50"
            }`}
          >
            {t.label}
            <span className={`ml-1.5 px-1.5 py-0.5 rounded text-xs ${
              tab === t.id ? "bg-sky-100 text-sky-700" : "bg-slate-200 text-slate-600"
            }`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      <div className="p-6">
        {tab === "pagos" && (
          <div>
            <PagoProveedorForm eventoId={evento.id} />
            <div className="mt-6 space-y-2">
              {evento.pagosProveedores.map((p) => (
                <div
                  key={p.id}
                  className="flex justify-between items-start gap-4 py-4 px-4 rounded-lg bg-slate-50 hover:bg-slate-100/80 border border-slate-100 transition-colors"
                >
                  <div>
                    <span className="font-semibold text-slate-900">{p.proveedor.nombre}</span>
                    <span className="text-slate-500 text-sm ml-2">({p.rubro.nombre})</span>
                    {p.concepto && (
                      <p className="text-slate-500 text-sm mt-0.5">{p.concepto}</p>
                    )}
                    <p className="text-slate-400 text-xs mt-1">
                      {new Date(p.fecha).toLocaleDateString("es-AR")} •{" "}
                      {metodos[p.metodoPago] ?? p.metodoPago}
                    </p>
                  </div>
                  <span className="font-bold text-slate-900 tabular-nums shrink-0">
                    ${p.monto.toLocaleString("es-AR")}
                  </span>
                </div>
              ))}
              {evento.pagosProveedores.length === 0 && (
                <p className="text-slate-500 py-8 text-center">No hay pagos registrados</p>
              )}
            </div>
          </div>
        )}

        {tab === "utileros" && (
          <div>
            <DiaUtileroForm eventoId={evento.id} />
            <div className="mt-6 space-y-2">
              {evento.diasUtileros.map((d) => (
                <div
                  key={d.id}
                  className="flex justify-between items-start gap-4 py-4 px-4 rounded-lg bg-slate-50 hover:bg-slate-100/80 border border-slate-100 transition-colors"
                >
                  <div>
                    <span className="font-semibold text-slate-900">{d.utilero.nombre}</span>
                    <p className="text-slate-500 text-sm mt-0.5">
                      {TIPOS_DIA[d.tipo ?? "EVENTO"] ?? d.tipo} • {d.dias} día(s) × ${d.utilero.tarifaPorDia.toLocaleString("es-AR")}
                    </p>
                  </div>
                  <span className="font-bold text-slate-900 tabular-nums shrink-0">
                    ${d.monto.toLocaleString("es-AR")}
                  </span>
                </div>
              ))}
              {evento.diasUtileros.length === 0 && (
                <p className="text-slate-500 py-8 text-center">No hay días de utileros registrados</p>
              )}
            </div>
          </div>
        )}

        {tab === "caja" && (
          <div>
            <CajaChicaForm eventoId={evento.id} />
            <div className="mt-6 space-y-2">
              {(evento.cajaChica ?? []).map((c) => (
                <div
                  key={c.id}
                  className="flex justify-between items-start gap-4 py-4 px-4 rounded-lg bg-slate-50 hover:bg-slate-100/80 border border-slate-100 transition-colors"
                >
                  <div>
                    <span className="font-semibold text-slate-900">{c.empleadaEncargada}</span>
                    {c.concepto && (
                      <p className="text-slate-500 text-sm mt-0.5">{c.concepto}</p>
                    )}
                    <p className="text-slate-400 text-xs mt-1">
                      {new Date(c.fecha).toLocaleDateString("es-AR")}
                    </p>
                  </div>
                  <span className="font-bold text-slate-900 tabular-nums shrink-0">
                    ${c.monto.toLocaleString("es-AR")}
                  </span>
                </div>
              ))}
              {(evento.cajaChica?.length ?? 0) === 0 && (
                <p className="text-slate-500 py-8 text-center">
                  No hay caja chica registrada. Monto para gastos extras del evento (comida, taxis, etc.).
                </p>
              )}
            </div>
          </div>
        )}

        {tab === "ingresos" && (
          <div>
            {isAdmin && <IngresoForm eventoId={evento.id} />}
            <div className="mt-6 space-y-2">
              {evento.ingresos.map((i) => (
                <div
                  key={i.id}
                  className="flex justify-between items-start gap-4 py-4 px-4 rounded-lg bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-100 transition-colors"
                >
                  <div>
                    <span className="font-semibold text-slate-900">{tiposIngreso[i.tipo] ?? i.tipo}</span>
                    {i.concepto && (
                      <p className="text-slate-500 text-sm mt-0.5">{i.concepto}</p>
                    )}
                    {i.numeroFactura && (
                      <p className="text-slate-500 text-xs mt-0.5">Factura: {i.numeroFactura}</p>
                    )}
                    <p className="text-slate-400 text-xs mt-1">
                      {new Date(i.fecha).toLocaleDateString("es-AR")}
                    </p>
                  </div>
                  <span className="font-bold text-emerald-600 tabular-nums shrink-0">
                    +${i.monto.toLocaleString("es-AR")}
                  </span>
                </div>
              ))}
              {evento.ingresos.length === 0 && (
                <p className="text-slate-500 py-8 text-center">
                  No hay ingresos registrados{!isAdmin && " (solo admins pueden cargar)"}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
