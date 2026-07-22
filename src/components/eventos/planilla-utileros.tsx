"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DiaUtileroForm } from "./dia-utilero-form";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

type DiaUtilero = {
  id: string;
  tipo?: string;
  dias: number;
  monto: number;
  utileroId: string;
  utilero: { id: string; nombre: string };
};

type UtileroEnEvento = {
  id: string;
  utileroId: string;
  anticipo: number;
  montoTransferencia: number | null;
  montoEfectivo: number | null;
};

type Props = {
  eventoId: string;
  fecha: Date;
  diasArmado?: number;
  diasUtileros: DiaUtilero[];
  utilerosEnEvento: UtileroEnEvento[];
  puedeEditarDiasArmado: boolean;
  puedeAgregarFilas: boolean;
  puedeEditarMontosTarea: boolean;
  puedeVerColumnasPago: boolean;
  onDiasArmadoChange?: (dias: number) => void;
};

function formatMonto(n: number) {
  return n.toLocaleString("es-AR");
}

export function PlanillaUtileros({
  eventoId,
  fecha,
  diasArmado = 2,
  diasUtileros,
  utilerosEnEvento,
  puedeEditarDiasArmado,
  puedeAgregarFilas,
  puedeEditarMontosTarea,
  puedeVerColumnasPago,
  onDiasArmadoChange,
}: Props) {
  const router = useRouter();
  const [editingCell, setEditingCell] = useState<{
    utileroId: string;
    tipo: string;
    diaUtileroId?: string;
  } | null>(null);
  const [editingPago, setEditingPago] = useState<{
    utileroId: string;
    field: "anticipo" | "transferencia";
    utileroEnEventoId?: string;
  } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [loading, setLoading] = useState(false);

  const fechaEvento = new Date(fecha);
  const fechaArmado1 = new Date(fechaEvento);
  fechaArmado1.setDate(fechaArmado1.getDate() - 2);
  const fechaArmado2 = new Date(fechaEvento);
  fechaArmado2.setDate(fechaArmado2.getDate() - 1);
  const fechaGuardia = new Date(fechaEvento);
  const fechaDesarmeEvento = new Date(fechaEvento);
  fechaDesarmeEvento.setDate(fechaDesarmeEvento.getDate() + 1);
  const fechaDesarmeDepo = new Date(fechaEvento);
  fechaDesarmeDepo.setDate(fechaDesarmeDepo.getDate() + 2);

  const utilerosUnicos = Array.from(
    new Map(diasUtileros.map((d) => [d.utileroId, d.utilero])).values()
  );

  const getMonto = (utileroId: string, tipo: string): number => {
    const d = diasUtileros.find((x) => x.utileroId === utileroId && x.tipo === tipo);
    if (d) return d.monto;
    const armado = diasUtileros.find((x) => x.utileroId === utileroId && x.tipo === "ARMADO");
    if (armado && (tipo === "ARMADO_1" || tipo === "ARMADO_2")) return armado.monto;
    return 0;
  };

  const getTotal = (utileroId: string) => {
    let total = 0;
    if (diasArmado >= 1) total += getMonto(utileroId, "ARMADO_1") || getMonto(utileroId, "ARMADO");
    if (diasArmado >= 2) total += getMonto(utileroId, "ARMADO_2");
    total += getMonto(utileroId, "GUARDIA");
    total += getMonto(utileroId, "DESARME_DEPO");
    total += getMonto(utileroId, "DESARME_EVENTO");
    return total;
  };

  const getUtileroEnEvento = (utileroId: string): UtileroEnEvento | undefined =>
    utilerosEnEvento.find((u) => u.utileroId === utileroId);

  const getEfectivoAPagar = (utileroId: string) => {
    const total = getTotal(utileroId);
    const ue = getUtileroEnEvento(utileroId);
    const anticipo = ue?.anticipo ?? 0;
    const transferencia = ue?.montoTransferencia ?? 0;
    return Math.max(0, total - anticipo - transferencia);
  };

  async function saveMonto(utileroId: string, tipo: string, value: number) {
    const diaUtilero = diasUtileros.find(
      (d) =>
        d.utileroId === utileroId &&
        (d.tipo === tipo || (tipo === "ARMADO_1" && d.tipo === "ARMADO") || (tipo === "ARMADO_2" && d.tipo === "ARMADO"))
    );
    setLoading(true);
    try {
      if (diaUtilero) {
        await fetch(`/api/dias-utilero/${diaUtilero.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ monto: value }),
        });
      } else {
        await fetch("/api/dias-utilero", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventoId,
            utileroId,
            tipo,
            dias: 1,
            monto: value,
          }),
        });
      }
      router.refresh();
    } finally {
      setLoading(false);
      setEditingCell(null);
    }
  }

  async function savePago(
    utileroId: string,
    anticipo: number,
    transferencia: number | null
  ) {
    setLoading(true);
    try {
      const ue = getUtileroEnEvento(utileroId);
      if (ue) {
        await fetch(`/api/utileros-evento/${ue.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            anticipo,
            montoTransferencia: transferencia,
          }),
        });
      } else {
        await fetch("/api/utileros-evento", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventoId,
            utileroId,
            anticipo,
            montoTransferencia: transferencia,
          }),
        });
      }
      router.refresh();
    } finally {
      setLoading(false);
      setEditingPago(null);
    }
  }

  const thClass =
    "py-2.5 px-2 text-left text-[11px] font-semibold text-neutral-500 uppercase tracking-wide bg-neutral-50 border-b border-neutral-100";
  const tdClass = (i: number) =>
    `py-2 px-2 text-sm tabular-nums ${i % 2 === 0 ? "bg-white" : "bg-neutral-50"}`;
  const tdPagoClass = (i: number) =>
    `py-2 px-2 text-sm tabular-nums bg-neutral-200/50 ${i % 2 === 0 ? "border-l border-neutral-200/90" : ""}`;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-neutral-200 shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-6 py-4">
        <div>
          <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-600">Equipo operativo</p>
          <h2 className="text-lg font-semibold tracking-tight text-neutral-900">Planilla de pagos · Utileros</h2>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-neutral-600 text-sm">Días de armado</label>
          {puedeEditarDiasArmado && onDiasArmadoChange ? (
            <select
              value={diasArmado}
              onChange={(e) => onDiasArmadoChange(parseInt(e.target.value, 10))}
              className="px-3 py-1.5 bg-white border border-neutral-200 rounded-lg text-neutral-900 font-medium focus:ring-2 focus:ring-neutral-300 focus:border-neutral-300"
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
            </select>
          ) : (
            <span className="px-3 py-1.5 bg-white border border-neutral-200 rounded-lg text-neutral-900 font-medium">
              {diasArmado}
            </span>
          )}
        </div>
      </div>

      {puedeAgregarFilas && (
        <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50/50">
          <DiaUtileroForm eventoId={eventoId} />
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[1150px]">
          <thead>
            <tr className="border-b border-neutral-200">
              <th className={`${thClass} w-[90px]`}>Fecha</th>
              <th className={`${thClass} w-[120px]`}>Nombre</th>
              {diasArmado >= 1 && (
                <th className={`${thClass} w-[85px]`}>
                  Arm 1 ({fechaArmado1.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })})
                </th>
              )}
              {diasArmado >= 2 && (
                <th className={`${thClass} w-[85px]`}>
                  Arm 2 ({fechaArmado2.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })})
                </th>
              )}
              <th className={`${thClass} w-[75px]`}>
                Guard {fechaGuardia.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })}
              </th>
              <th className={`${thClass} w-[85px]`}>
                Des. evento {fechaDesarmeEvento.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })}
              </th>
              <th className={`${thClass} w-[85px]`}>
                Des. depo {fechaDesarmeDepo.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })}
              </th>
              <th className={`${thClass} w-[90px]`}>Total</th>
              {puedeVerColumnasPago && (
                <>
                  <th className={`${thClass} w-[75px]`}>Anticipo</th>
                  <th className={`${thClass} w-[85px]`}>Transfer.</th>
                  <th className={`${thClass} w-[90px]`}>Efectivo</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {utilerosUnicos.map((utilero, i) => {
              const total = getTotal(utilero.id);
              const ue = getUtileroEnEvento(utilero.id);
              const efectivo = getEfectivoAPagar(utilero.id);

              return (
                <tr key={utilero.id} className="border-b border-neutral-100">
                  <td className={tdClass(i)}>
                    {fechaEvento.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                  </td>
                  <td className={`${tdClass(i)} font-medium text-neutral-900`}>{utilero.nombre}</td>
                  {diasArmado >= 1 && (
                    <td className={tdClass(i)}>
                      {editingCell?.utileroId === utilero.id && editingCell?.tipo === "ARMADO_1" ? (
                        <input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => {
                            const v = parseFloat(editValue);
                            if (!isNaN(v)) saveMonto(utilero.id, "ARMADO_1", v);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const v = parseFloat(editValue);
                              if (!isNaN(v)) saveMonto(utilero.id, "ARMADO_1", v);
                            }
                          }}
                          className="w-20 px-2 py-1 border rounded text-neutral-900 text-right"
                          autoFocus
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (puedeEditarMontosTarea) {
                              setEditingCell({ utileroId: utilero.id, tipo: "ARMADO_1" });
                              setEditValue(String(getMonto(utilero.id, "ARMADO_1") || getMonto(utilero.id, "ARMADO") || ""));
                            }
                          }}
                          className={`text-left w-full ${puedeEditarMontosTarea ? "hover:bg-neutral-100 rounded px-1 -mx-1 cursor-pointer" : ""}`}
                        >
                          ${formatMonto(getMonto(utilero.id, "ARMADO_1") || getMonto(utilero.id, "ARMADO"))}
                        </button>
                      )}
                    </td>
                  )}
                  {diasArmado >= 2 && (
                    <td className={tdClass(i)}>
                      {editingCell?.utileroId === utilero.id && editingCell?.tipo === "ARMADO_2" ? (
                        <input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => {
                            const v = parseFloat(editValue);
                            if (!isNaN(v)) saveMonto(utilero.id, "ARMADO_2", v);
                          }}
                          className="w-20 px-2 py-1 border rounded text-neutral-900 text-right"
                          autoFocus
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (puedeEditarMontosTarea) {
                              setEditingCell({ utileroId: utilero.id, tipo: "ARMADO_2" });
                              setEditValue(String(getMonto(utilero.id, "ARMADO_2") || ""));
                            }
                          }}
                          className={`text-left w-full ${puedeEditarMontosTarea ? "hover:bg-neutral-100 rounded px-1 -mx-1 cursor-pointer" : ""}`}
                        >
                          ${formatMonto(getMonto(utilero.id, "ARMADO_2"))}
                        </button>
                      )}
                    </td>
                  )}
                  <td className={tdClass(i)}>
                    {editingCell?.utileroId === utilero.id && editingCell?.tipo === "GUARDIA" ? (
                      <input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => {
                          const v = parseFloat(editValue);
                          if (!isNaN(v)) saveMonto(utilero.id, "GUARDIA", v);
                        }}
                        className="w-20 px-2 py-1 border rounded text-neutral-900 text-right"
                        autoFocus
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (puedeEditarMontosTarea) {
                            setEditingCell({ utileroId: utilero.id, tipo: "GUARDIA" });
                            setEditValue(String(getMonto(utilero.id, "GUARDIA") || ""));
                          }
                        }}
                        className={`text-left w-full ${puedeEditarMontosTarea ? "hover:bg-neutral-100 rounded px-1 -mx-1 cursor-pointer" : ""}`}
                      >
                        ${formatMonto(getMonto(utilero.id, "GUARDIA"))}
                      </button>
                    )}
                  </td>
                  <td className={tdClass(i)}>
                    {editingCell?.utileroId === utilero.id && editingCell?.tipo === "DESARME_EVENTO" ? (
                      <input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => {
                          const v = parseFloat(editValue);
                          if (!isNaN(v)) saveMonto(utilero.id, "DESARME_EVENTO", v);
                        }}
                        className="w-20 px-2 py-1 border rounded text-neutral-900 text-right"
                        autoFocus
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (puedeEditarMontosTarea) {
                            setEditingCell({ utileroId: utilero.id, tipo: "DESARME_EVENTO" });
                            setEditValue(String(getMonto(utilero.id, "DESARME_EVENTO") || ""));
                          }
                        }}
                        className={`text-left w-full ${puedeEditarMontosTarea ? "hover:bg-neutral-100 rounded px-1 -mx-1 cursor-pointer" : ""}`}
                      >
                        ${formatMonto(getMonto(utilero.id, "DESARME_EVENTO"))}
                      </button>
                    )}
                  </td>
                  <td className={tdClass(i)}>
                    {editingCell?.utileroId === utilero.id && editingCell?.tipo === "DESARME_DEPO" ? (
                      <input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => {
                          const v = parseFloat(editValue);
                          if (!isNaN(v)) saveMonto(utilero.id, "DESARME_DEPO", v);
                        }}
                        className="w-20 px-2 py-1 border rounded text-neutral-900 text-right"
                        autoFocus
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (puedeEditarMontosTarea) {
                            setEditingCell({ utileroId: utilero.id, tipo: "DESARME_DEPO" });
                            setEditValue(String(getMonto(utilero.id, "DESARME_DEPO") || ""));
                          }
                        }}
                        className={`text-left w-full ${puedeEditarMontosTarea ? "hover:bg-neutral-100 rounded px-1 -mx-1 cursor-pointer" : ""}`}
                      >
                        ${formatMonto(getMonto(utilero.id, "DESARME_DEPO"))}
                      </button>
                    )}
                  </td>
                  <td className={`${tdClass(i)} font-semibold text-neutral-900`}>
                    ${formatMonto(total)}
                  </td>
                  {puedeVerColumnasPago && (
                    <>
                      <td className={tdPagoClass(i)}>
                        {editingPago?.utileroId === utilero.id && editingPago?.field === "anticipo" ? (
                          <div className="flex gap-1">
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => {
                                const v = parseFloat(editValue);
                                if (!isNaN(v)) savePago(utilero.id, v, ue?.montoTransferencia ?? null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const v = parseFloat(editValue);
                                  if (!isNaN(v)) savePago(utilero.id, v, ue?.montoTransferencia ?? null);
                                }
                              }}
                              className="w-20 px-2 py-1 border rounded text-neutral-900"
                              autoFocus
                            />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPago({ utileroId: utilero.id, field: "anticipo", utileroEnEventoId: ue?.id });
                              setEditValue(String(ue?.anticipo ?? ""));
                            }}
                            className="text-left w-full hover:bg-neutral-100 rounded px-1 -mx-1 cursor-pointer"
                          >
                            ${formatMonto(ue?.anticipo ?? 0)}
                          </button>
                        )}
                      </td>
                      <td className={tdPagoClass(i)}>
                        {editingPago?.utileroId === utilero.id && editingPago?.field === "transferencia" ? (
                          <div className="flex gap-1">
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => {
                                const v = parseFloat(editValue);
                                if (!isNaN(v)) savePago(utilero.id, ue?.anticipo ?? 0, v);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const v = parseFloat(editValue);
                                  if (!isNaN(v)) savePago(utilero.id, ue?.anticipo ?? 0, v);
                                }
                              }}
                              className="w-24 px-2 py-1 border rounded text-neutral-900"
                              autoFocus
                            />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPago({ utileroId: utilero.id, field: "transferencia", utileroEnEventoId: ue?.id });
                              setEditValue(String(ue?.montoTransferencia ?? ""));
                            }}
                            className="text-left w-full hover:bg-neutral-100 rounded px-1 -mx-1 cursor-pointer"
                          >
                            ${formatMonto(ue?.montoTransferencia ?? 0)}
                          </button>
                        )}
                      </td>
                      <td className={tdPagoClass(i)}>
                        <span className="font-medium">${formatMonto(efectivo)}</span>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {utilerosUnicos.length === 0 && (
        <p className="py-12 text-center text-neutral-500">
          No hay utileros cargados. Agregá tareas con el formulario de arriba.
        </p>
      )}

      {loading && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
          <LoadingSpinner className="h-8 w-8" />
        </div>
      )}
    </div>
  );
}
