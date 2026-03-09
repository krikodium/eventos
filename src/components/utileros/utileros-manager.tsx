"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Utilero = { id: string; nombre: string; tarifaPorDia: number };

export function UtilerosManager() {
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
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Agregar utilero</h2>
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 mb-6">
        <input
          type="text"
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          placeholder="Nombre"
          className="min-w-[200px] px-4 py-2 rounded bg-white border border-gray-300 text-gray-900"
        />
        <input
          type="number"
          step="0.01"
          value={form.tarifaPorDia}
          onChange={(e) => setForm({ ...form, tarifaPorDia: e.target.value })}
          placeholder="Tarifa por día"
          className="w-32 px-4 py-2 rounded bg-white border border-gray-300 text-gray-900"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded"
        >
          Agregar
        </button>
      </form>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-gray-600 border-b border-gray-200">
              <th className="py-2">Nombre</th>
              <th className="py-2">Tarifa/día</th>
            </tr>
          </thead>
          <tbody>
            {utileros.map((u) => (
              <tr key={u.id} className="border-b border-gray-200">
                <td className="py-2 text-gray-900">{u.nombre}</td>
                <td className="py-2 text-gray-600">
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
