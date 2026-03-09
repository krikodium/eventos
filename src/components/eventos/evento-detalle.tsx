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

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setTab("pagos")}
          className={`px-6 py-3 font-medium ${
            tab === "pagos" ? "text-sky-600 border-b-2 border-sky-600" : "text-gray-500 hover:text-gray-900"
          }`}
        >
          Pagos a proveedores ({evento.pagosProveedores.length})
        </button>
        <button
          onClick={() => setTab("utileros")}
          className={`px-6 py-3 font-medium ${
            tab === "utileros" ? "text-sky-600 border-b-2 border-sky-600" : "text-gray-500 hover:text-gray-900"
          }`}
        >
          Utileros ({evento.diasUtileros.length})
        </button>
        <button
          onClick={() => setTab("caja")}
          className={`px-6 py-3 font-medium ${
            tab === "caja" ? "text-sky-600 border-b-2 border-sky-600" : "text-gray-500 hover:text-gray-900"
          }`}
        >
          Caja chica ({(evento.cajaChica?.length ?? 0)})
        </button>
        <button
          onClick={() => setTab("ingresos")}
          className={`px-6 py-3 font-medium ${
            tab === "ingresos" ? "text-sky-600 border-b-2 border-sky-600" : "text-gray-500 hover:text-gray-900"
          }`}
        >
          Ingresos ({evento.ingresos.length})
        </button>
      </div>

      <div className="p-6">
        {tab === "pagos" && (
          <div>
            <PagoProveedorForm eventoId={evento.id} />
            <div className="mt-6 space-y-2">
              {evento.pagosProveedores.map((p) => (
                <div
                  key={p.id}
                  className="flex justify-between items-center py-2 border-b border-gray-200"
                >
                  <div>
                    <span className="text-gray-900">{p.proveedor.nombre}</span>
                    <span className="text-gray-500 text-sm ml-2">({p.rubro.nombre})</span>
                    {p.concepto && (
                      <p className="text-gray-500 text-sm">{p.concepto}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-gray-900 font-medium">
                      ${p.monto.toLocaleString("es-AR")}
                    </span>
                    <p className="text-gray-500 text-xs">
                      {new Date(p.fecha).toLocaleDateString("es-AR")} •{" "}
                      {metodos[p.metodoPago] ?? p.metodoPago}
                    </p>
                  </div>
                </div>
              ))}
              {evento.pagosProveedores.length === 0 && (
                <p className="text-gray-500 py-4">No hay pagos registrados</p>
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
                  className="flex justify-between items-center py-2 border-b border-gray-200"
                >
                  <div>
                    <span className="text-gray-900 font-medium">{d.utilero.nombre}</span>
                    <p className="text-gray-500 text-sm">
                      {TIPOS_DIA[d.tipo ?? "EVENTO"] ?? d.tipo} • {d.dias} día(s) × ${d.utilero.tarifaPorDia.toLocaleString("es-AR")}
                    </p>
                  </div>
                  <span className="text-gray-900 font-medium">
                    ${d.monto.toLocaleString("es-AR")}
                  </span>
                </div>
              ))}
              {evento.diasUtileros.length === 0 && (
                <p className="text-gray-500 py-4">No hay días de utileros registrados</p>
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
                  className="flex justify-between items-center py-2 border-b border-gray-200"
                >
                  <div>
                    <span className="text-gray-900 font-medium">{c.empleadaEncargada}</span>
                    {c.concepto && (
                      <p className="text-gray-500 text-sm">{c.concepto}</p>
                    )}
                    <p className="text-gray-400 text-xs">
                      {new Date(c.fecha).toLocaleDateString("es-AR")}
                    </p>
                  </div>
                  <span className="text-gray-900 font-medium">
                    ${c.monto.toLocaleString("es-AR")}
                  </span>
                </div>
              ))}
              {(evento.cajaChica?.length ?? 0) === 0 && (
                <p className="text-gray-500 py-4">
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
                  className="flex justify-between items-center py-2 border-b border-gray-200"
                >
                  <div>
                    <span className="text-gray-900">{tiposIngreso[i.tipo] ?? i.tipo}</span>
                    {i.concepto && (
                      <p className="text-gray-500 text-sm">{i.concepto}</p>
                    )}
                    {i.numeroFactura && (
                      <p className="text-gray-500 text-xs">Factura: {i.numeroFactura}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-sky-600 font-medium">
                      ${i.monto.toLocaleString("es-AR")}
                    </span>
                    <p className="text-gray-500 text-xs">
                      {new Date(i.fecha).toLocaleDateString("es-AR")}
                    </p>
                  </div>
                </div>
              ))}
              {evento.ingresos.length === 0 && (
                <p className="text-gray-500 py-4">
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
