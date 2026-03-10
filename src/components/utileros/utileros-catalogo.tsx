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
    <div className="mt-8 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-700 bg-slate-800">
        <h3 className="font-semibold text-white text-sm uppercase tracking-wider">Catálogo de utileros</h3>
        <p className="text-slate-300 text-xs mt-0.5">
          Agregá utileros con su tarifa por día. Luego cargá los días trabajados en cada evento.
        </p>
      </div>
      <div className="p-6">
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 mb-6">
          <input
            type="text"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            placeholder="Nombre"
            className="min-w-[200px] px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 text-sm"
          />
          <input
            type="number"
            step="0.01"
            value={form.tarifaPorDia}
            onChange={(e) => setForm({ ...form, tarifaPorDia: e.target.value })}
            placeholder="Tarifa por día"
            className="w-32 px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-200 font-medium text-sm shadow-sm hover:shadow transition-all disabled:opacity-50"
          >
            Agregar
          </button>
        </form>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-slate-900 uppercase tracking-wider bg-slate-50">
                <th className="py-3 px-4">Nombre</th>
                <th className="py-3 px-4">Tarifa/día</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {utileros.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4 font-medium text-slate-900">{u.nombre}</td>
                  <td className="py-3 px-4 text-slate-600 tabular-nums">
                    ${u.tarifaPorDia.toLocaleString("es-AR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
