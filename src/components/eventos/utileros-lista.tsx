"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

type Item = {
  id: string;
  dias: number;
  monto: number;
  tipo?: string;
  montoTransferencia?: number | null;
  montoEfectivo?: number | null;
  utilero: { nombre: string };
};

type Props = {
  items: Item[];
  tiposLabel: Record<string, string>;
  onRefresh?: () => void;
};

export function UtilerosLista({ items, tiposLabel, onRefresh }: Props) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState({ monto: "", montoTransferencia: "", montoEfectivo: "" });
  const [loading, setLoading] = useState(false);

  async function handleSave(id: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/dias-utilero/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monto: edit.monto ? parseFloat(edit.monto) : undefined,
          montoTransferencia: edit.montoTransferencia === "" ? null : edit.montoTransferencia ? parseFloat(edit.montoTransferencia) : undefined,
          montoEfectivo: edit.montoEfectivo === "" ? null : edit.montoEfectivo ? parseFloat(edit.montoEfectivo) : undefined,
        }),
      });
      if (!res.ok) throw new Error("Error");
      setEditingId(null);
      router.refresh();
      onRefresh?.();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "px-2 py-1.5 rounded border border-neutral-200 text-neutral-900 text-sm w-20 focus:ring-1 focus:ring-neutral-300 focus:border-neutral-300";

  if (items.length === 0) return null;

  const totalTransferencia = items.reduce((s, d) => s + (d.montoTransferencia ?? 0), 0);
  const totalEfectivo = items.reduce((s, d) => s + (d.montoEfectivo ?? 0), 0);
  const totalGeneral = items.reduce((s, d) => s + d.monto, 0);

  return (
    <div className="mt-6 space-y-2">
      <div className="flex items-center justify-between text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2 px-1">
        <span>Utilero • Tarea</span>
        <span className="flex gap-8">
          <span className="w-24 text-right">Total</span>
          <span className="w-20 text-right">Transfer.</span>
          <span className="w-20 text-right">Efectivo</span>
        </span>
      </div>
      {items.map((d) => {
        const isEditing = editingId === d.id;
        const transf = d.montoTransferencia ?? 0;
        const efect = d.montoEfectivo ?? 0;

        return (
          <div
            key={d.id}
            className="flex flex-wrap items-center justify-between gap-4 py-4 px-4 rounded-lg bg-neutral-50 hover:bg-neutral-100/80 border border-neutral-100 transition-colors"
          >
            <div className="min-w-0">
              <span className="font-semibold text-neutral-900">{d.utilero.nombre}</span>
              <p className="text-neutral-500 text-sm mt-0.5">
                {tiposLabel[d.tipo ?? "EVENTO"] ?? d.tipo}
                {(d.tipo === "ARMADO" || d.tipo === "EVENTO") && ` • ${d.dias} día${d.dias !== 1 ? "s" : ""}`}
              </p>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              {isEditing ? (
                <>
                  <div>
                    <label className="text-xs text-neutral-500 block mb-0.5">Monto</label>
                    <input
                      type="number"
                      step="1"
                      value={edit.monto}
                      onChange={(e) => setEdit({ ...edit, monto: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-500 block mb-0.5">Transfer.</label>
                    <input
                      type="number"
                      step="1"
                      value={edit.montoTransferencia}
                      onChange={(e) => setEdit({ ...edit, montoTransferencia: e.target.value })}
                      placeholder="0"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-500 block mb-0.5">Efectivo</label>
                    <input
                      type="number"
                      step="1"
                      value={edit.montoEfectivo}
                      onChange={(e) => setEdit({ ...edit, montoEfectivo: e.target.value })}
                      placeholder="0"
                      className={inputClass}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSave(d.id)}
                      disabled={loading}
                      className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-sm rounded-lg font-medium disabled:opacity-50 flex items-center gap-1"
                    >
                      {loading ? <LoadingSpinner className="h-3.5 w-3.5" /> : null}
                      Guardar
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 text-sm rounded-lg font-medium"
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-right">
                    <span className="font-bold text-neutral-900 tabular-nums">
                      ${d.monto.toLocaleString("es-AR")}
                    </span>
                  </div>
                  <div className="text-right w-20">
                    <span className="text-neutral-600 text-sm tabular-nums">
                      ${transf.toLocaleString("es-AR")}
                    </span>
                  </div>
                  <div className="text-right w-20">
                    <span className="text-neutral-600 text-sm tabular-nums">
                      ${efect.toLocaleString("es-AR")}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(d.id);
                      setEdit({
                        monto: String(d.monto),
                        montoTransferencia: d.montoTransferencia != null ? String(d.montoTransferencia) : "",
                        montoEfectivo: d.montoEfectivo != null ? String(d.montoEfectivo) : "",
                      });
                    }}
                    className="px-2 py-1 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded text-xs font-medium"
                  >
                    Editar
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
      <div className="mt-4 pt-4 border-t border-neutral-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-6 text-sm">
          <span className="text-neutral-600">
            Total: <strong className="text-neutral-900 tabular-nums">${totalGeneral.toLocaleString("es-AR")}</strong>
          </span>
          <span className="text-neutral-600">
            Transferencia: <strong className="text-neutral-900 tabular-nums">${totalTransferencia.toLocaleString("es-AR")}</strong>
          </span>
          <span className="text-neutral-600">
            Efectivo: <strong className="text-neutral-900 tabular-nums">${totalEfectivo.toLocaleString("es-AR")}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
