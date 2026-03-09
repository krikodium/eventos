"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export function DiaUtileroForm({ eventoId }: { eventoId: string }) {
  const router = useRouter();
  const [utileros, setUtileros] = useState<Array<{ id: string; nombre: string; tarifaPorDia: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    utileroId: "",
    dias: "1",
    tipo: "EVENTO" as string,
  });

  const tipos = [
    { value: "ARMADO", label: "Armado" },
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.utileroId || !form.dias) return;
    setLoading(true);
    try {
      const res = await fetch("/api/dias-utilero", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventoId,
          utileroId: form.utileroId,
          dias: parseFloat(form.dias),
          tipo: form.tipo,
        }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      setForm({ ...form, dias: "1" } as typeof form);
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end p-4 bg-gray-50 rounded-lg border border-gray-200 mb-4">
      <div className="min-w-[200px]">
        <label className="block text-xs text-gray-600 mb-1">Utilero</label>
        <select
          value={form.utileroId}
          onChange={(e) => setForm({ ...form, utileroId: e.target.value })}
          required
          className="w-full px-3 py-2 rounded bg-white border border-gray-300 text-gray-900 text-sm"
        >
          <option value="">Seleccionar</option>
          {utileros.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nombre} (${u.tarifaPorDia.toLocaleString("es-AR")}/día)
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-600 mb-1">Tipo de día</label>
        <select
          value={form.tipo}
          onChange={(e) => setForm({ ...form, tipo: e.target.value })}
          className="px-3 py-2 rounded bg-white border border-gray-300 text-gray-900 text-sm"
        >
          {tipos.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-600 mb-1">Días</label>
        <input
          type="number"
          step="0.5"
          min="0.5"
          value={form.dias}
          onChange={(e) => setForm({ ...form, dias: e.target.value })}
          required
          className="w-20 px-3 py-2 rounded bg-white border border-gray-300 text-gray-900 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded text-sm"
      >
        Agregar
      </button>
    </form>
  );
}
