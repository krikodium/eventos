"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CajaChicaForm({ eventoId }: { eventoId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    monto: "",
    empleadaEncargada: "",
    concepto: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.monto || !form.empleadaEncargada) return;
    setLoading(true);
    try {
      const res = await fetch("/api/caja-chica", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventoId,
          monto: parseFloat(form.monto),
          empleadaEncargada: form.empleadaEncargada.trim(),
          concepto: form.concepto.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      setForm({ monto: "", empleadaEncargada: "", concepto: "" });
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end p-4 bg-gray-50 rounded-lg border border-gray-200 mb-4">
      <div>
        <label className="block text-xs text-gray-600 mb-1 font-medium">Monto</label>
        <input
          type="number"
          step="0.01"
          value={form.monto}
          onChange={(e) => setForm({ ...form, monto: e.target.value })}
          required
          placeholder="0"
          className="w-28 px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 text-sm"
        />
      </div>
      <div className="min-w-[180px]">
        <label className="block text-xs text-gray-600 mb-1 font-medium">Empleada encargada</label>
        <input
          type="text"
          value={form.empleadaEncargada}
          onChange={(e) => setForm({ ...form, empleadaEncargada: e.target.value })}
          required
          placeholder="Nombre de la empleada"
          className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 text-sm"
        />
      </div>
      <div className="min-w-[150px]">
        <label className="block text-xs text-gray-600 mb-1 font-medium">Concepto (opcional)</label>
        <input
          type="text"
          value={form.concepto}
          onChange={(e) => setForm({ ...form, concepto: e.target.value })}
          placeholder="Comida, taxis, gastos extras..."
          className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
      >
        Agregar
      </button>
    </form>
  );
}
