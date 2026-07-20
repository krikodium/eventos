"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Select } from "@/components/ui/select";

type Utilero = {
  id: string;
  nombre: string;
  tarifaPorDia: number;
  tarifaArmado?: number | null;
  tarifaDesarmeEvento?: number | null;
  tarifaDesarmeDepo?: number | null;
  tarifaGuardia?: number | null;
};

export function DiaUtileroForm({ eventoId }: { eventoId: string }) {
  const router = useRouter();
  const [utileros, setUtileros] = useState<Utilero[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    utileroId: "",
    tipo: "ARMADO_1" as string,
    dias: "1",
    monto: "",
    montoTransferencia: "",
    montoEfectivo: "",
  });

  const tipos = [
    { value: "ARMADO_1", label: "Armado 1" },
    { value: "ARMADO_2", label: "Armado 2" },
    { value: "GUARDIA", label: "Guardia" },
    { value: "EVENTO", label: "Día del evento" },
    { value: "DESARME_EVENTO", label: "Desarme en evento" },
    { value: "DESARME_DEPO", label: "Desarme en depósito" },
  ];

  useEffect(() => {
    fetch("/api/utileros")
      .then((r) => r.json())
      .then(setUtileros)
      .catch(console.error);
  }, []);

  function getTarifaDefault(u: Utilero, tipo: string): number {
    switch (tipo) {
      case "ARMADO_1":
      case "ARMADO_2":
      case "ARMADO":
        return u.tarifaArmado ?? u.tarifaPorDia;
      case "GUARDIA":
        return u.tarifaGuardia ?? u.tarifaPorDia;
      case "DESARME_EVENTO":
        return u.tarifaDesarmeEvento ?? u.tarifaPorDia;
      case "DESARME_DEPO":
        return u.tarifaDesarmeDepo ?? u.tarifaPorDia;
      default:
        return u.tarifaPorDia;
    }
  }

  useEffect(() => {
    if (form.utileroId && form.tipo && !form.monto) {
      const u = utileros.find((x) => x.id === form.utileroId);
      if (u) {
        const def = getTarifaDefault(u, form.tipo);
        setForm((f) => ({ ...f, monto: String(def) }));
      }
    }
  }, [form.utileroId, form.tipo, form.monto, utileros]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.utileroId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/dias-utilero", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventoId,
          utileroId: form.utileroId,
          dias:
            form.tipo === "EVENTO"
              ? parseFloat(form.dias)
              : 1,
          tipo: form.tipo,
          monto: form.monto ? parseFloat(form.monto) : undefined,
          montoTransferencia: form.montoTransferencia ? parseFloat(form.montoTransferencia) : undefined,
          montoEfectivo: form.montoEfectivo ? parseFloat(form.montoEfectivo) : undefined,
        }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      setForm({
        ...form,
        dias: "1",
        monto: "",
        montoTransferencia: "",
        montoEfectivo: "",
      });
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "px-3 py-2.5 rounded-lg bg-white border border-neutral-200 text-neutral-900 text-sm focus:ring-2 focus:ring-neutral-200 focus:border-neutral-300 transition-colors";
  const labelClass = "block text-xs font-medium text-neutral-600 mb-1.5";

  const utileroOptions = utileros.map((u) => ({
    value: u.id,
    label: u.nombre,
  }));

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap gap-x-5 gap-y-4 items-end p-6 bg-white rounded-xl border border-neutral-200 shadow-sm mb-6"
    >
      <div className="min-w-[180px]">
        <label className={labelClass}>Utilero</label>
        <Select
          value={form.utileroId}
          onChange={(v) => setForm({ ...form, utileroId: v, monto: "" })}
          options={utileroOptions}
          placeholder="Seleccionar"
          required
        />
      </div>
      <div className="min-w-[160px]">
        <label className={labelClass}>Tarea</label>
        <Select
          value={form.tipo}
          onChange={(v) => setForm({ ...form, tipo: v, monto: "" })}
          options={tipos}
        />
      </div>
      {form.tipo === "EVENTO" && (
        <div>
          <label className={labelClass}>Días</label>
          <input
            type="number"
            step="0.5"
            min="0.5"
            value={form.dias}
            onChange={(e) => setForm({ ...form, dias: e.target.value })}
            required
            className={`w-20 ${inputClass}`}
          />
        </div>
      )}
      <div>
        <label className={labelClass}>Monto ($)</label>
        <input
          type="number"
          step="1"
          min="0"
          value={form.monto}
          onChange={(e) => setForm({ ...form, monto: e.target.value })}
          required
          className={`w-28 ${inputClass}`}
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2.5 bg-white hover:bg-neutral-50 text-neutral-700 rounded-lg border border-neutral-200 font-medium text-sm shadow-sm hover:shadow transition-all disabled:opacity-50 flex items-center gap-2 min-w-[100px] justify-center"
      >
        {loading ? <LoadingSpinner className="h-4 w-4" /> : null}
        {loading ? "Guardando..." : "Agregar"}
      </button>
    </form>
  );
}
