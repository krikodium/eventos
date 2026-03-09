"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Utilero = { id: string; nombre: string; tarifaPorDia: number };

export function UtilerosCatalogo() {
  const router = useRouter();
  const [utileros, setUtileros] = useState<Utilero[]>([]);
  const [form, setForm] = useState({ nombre: "", tarifaPorDia: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/utileros")
      .then((r) => r.json())
      .then(setUtileros);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim() || !form.tarifaPorDia) return;
    setLoading(true);
    try {
      const res = await fetch("/api/utileros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          tarifaPorDia: parseFloat(form.tarifaPorDia),
        }),
      });
      if (!res.ok) throw new Error("Error");
      const utilero = await res.json();
      setUtileros((prev) => [...prev, utilero]);
      setForm({ nombre: "", tarifaPorDia: "" });
      router.refresh();
    } catch {
      setLoading(false);
    }
    setLoading(false);
  }

  return (
    <div className="mt-8 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Catálogo de utileros</h3>
      <p className="text-sm text-gray-500 mb-4">
        Agregá utileros con su tarifa por día. Luego cargá los días trabajados en cada evento.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 mb-6">
        <input
          type="text"
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          placeholder="Nombre"
          className="min-w-[200px] px-4 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-900 text-sm"
        />
        <input
          type="number"
          step="0.01"
          value={form.tarifaPorDia}
          onChange={(e) => setForm({ ...form, tarifaPorDia: e.target.value })}
          placeholder="Tarifa por día"
          className="w-32 px-4 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-900 text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-medium"
        >
          Agregar
        </button>
      </form>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
              <th className="py-3">Nombre</th>
              <th className="py-3">Tarifa/día</th>
            </tr>
          </thead>
          <tbody>
            {utileros.map((u) => (
              <tr key={u.id} className="border-b border-gray-100">
                <td className="py-3 text-gray-900 font-medium">{u.nombre}</td>
                <td className="py-3 text-gray-600">
                  ${u.tarifaPorDia.toLocaleString("es-AR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
