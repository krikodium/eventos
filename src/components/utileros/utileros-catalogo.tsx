"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Utilero = {
  id: string;
  nombre: string;
  tarifaPorDia: number;
  tarifaArmado?: number | null;
  tarifaDesarmeEvento?: number | null;
  tarifaDesarmeDepo?: number | null;
  tarifaGuardia?: number | null;
};

export function UtilerosCatalogo() {
  const router = useRouter();
  const [utileros, setUtileros] = useState<Utilero[]>([]);
  const [form, setForm] = useState({
    nombre: "",
    tarifaPorDia: "",
    tarifaArmado: "",
    tarifaDesarmeEvento: "",
    tarifaDesarmeDepo: "",
    tarifaGuardia: "",
  });
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    tarifaPorDia: "",
    tarifaArmado: "",
    tarifaDesarmeEvento: "",
    tarifaDesarmeDepo: "",
    tarifaGuardia: "",
  });

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
          tarifaArmado: form.tarifaArmado ? parseFloat(form.tarifaArmado) : undefined,
          tarifaDesarmeEvento: form.tarifaDesarmeEvento ? parseFloat(form.tarifaDesarmeEvento) : undefined,
          tarifaDesarmeDepo: form.tarifaDesarmeDepo ? parseFloat(form.tarifaDesarmeDepo) : undefined,
          tarifaGuardia: form.tarifaGuardia ? parseFloat(form.tarifaGuardia) : undefined,
        }),
      });
      if (!res.ok) throw new Error("Error");
      const utilero = await res.json();
      setUtileros((prev) => [...prev, utilero]);
      setForm({
        nombre: "",
        tarifaPorDia: "",
        tarifaArmado: "",
        tarifaDesarmeEvento: "",
        tarifaDesarmeDepo: "",
        tarifaGuardia: "",
      });
      router.refresh();
    } catch {
      setLoading(false);
    }
    setLoading(false);
  }

  async function handleUpdate(id: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/utileros/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tarifaPorDia: editForm.tarifaPorDia ? parseFloat(editForm.tarifaPorDia) : undefined,
          tarifaArmado: editForm.tarifaArmado === "" ? null : editForm.tarifaArmado ? parseFloat(editForm.tarifaArmado) : undefined,
          tarifaDesarmeEvento: editForm.tarifaDesarmeEvento === "" ? null : editForm.tarifaDesarmeEvento ? parseFloat(editForm.tarifaDesarmeEvento) : undefined,
          tarifaDesarmeDepo: editForm.tarifaDesarmeDepo === "" ? null : editForm.tarifaDesarmeDepo ? parseFloat(editForm.tarifaDesarmeDepo) : undefined,
          tarifaGuardia: editForm.tarifaGuardia === "" ? null : editForm.tarifaGuardia ? parseFloat(editForm.tarifaGuardia) : undefined,
        }),
      });
      if (!res.ok) throw new Error("Error");
      const updated = await res.json();
      setUtileros((prev) => prev.map((u) => (u.id === id ? updated : u)));
      setEditingId(null);
      router.refresh();
    } catch {
      setLoading(false);
    }
    setLoading(false);
  }

  const inputClass = "w-full px-2 py-1.5 rounded border border-neutral-200 text-neutral-900 text-sm";
  const thClass = "py-2 px-2 text-left text-xs font-semibold text-neutral-600 uppercase";

  return (
    <div className="mt-8 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="border-b border-neutral-100 px-6 py-5">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-600">Tarifario</p>
        <h3 className="text-lg font-semibold tracking-tight text-neutral-900">
          Catálogo de utileros
        </h3>
        <p className="mt-1 text-sm text-neutral-500">
          Tarifas por tarea (armado, desarme evento, desarme depósito, guardia). El monto se edita en cada evento.
        </p>
      </div>
      <div className="p-6">
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 mb-6">
          <input
            type="text"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            placeholder="Nombre"
            className="min-w-[160px] px-4 py-2 rounded-lg bg-white border border-neutral-200 text-neutral-900 text-sm"
          />
          <input
            type="number"
            step="1"
            value={form.tarifaPorDia}
            onChange={(e) => setForm({ ...form, tarifaPorDia: e.target.value })}
            placeholder="Día evento"
            className="w-24 px-4 py-2 rounded-lg bg-white border border-neutral-200 text-neutral-900 text-sm"
          />
          <input
            type="number"
            step="1"
            value={form.tarifaArmado}
            onChange={(e) => setForm({ ...form, tarifaArmado: e.target.value })}
            placeholder="Armado"
            className="w-24 px-4 py-2 rounded-lg bg-white border border-neutral-200 text-neutral-900 text-sm"
          />
          <input
            type="number"
            step="1"
            value={form.tarifaDesarmeEvento}
            onChange={(e) => setForm({ ...form, tarifaDesarmeEvento: e.target.value })}
            placeholder="Des. evento"
            className="w-24 px-4 py-2 rounded-lg bg-white border border-neutral-200 text-neutral-900 text-sm"
          />
          <input
            type="number"
            step="1"
            value={form.tarifaDesarmeDepo}
            onChange={(e) => setForm({ ...form, tarifaDesarmeDepo: e.target.value })}
            placeholder="Des. depósito"
            className="w-24 px-4 py-2 rounded-lg bg-white border border-neutral-200 text-neutral-900 text-sm"
          />
          <input
            type="number"
            step="1"
            value={form.tarifaGuardia}
            onChange={(e) => setForm({ ...form, tarifaGuardia: e.target.value })}
            placeholder="Guardia"
            className="w-24 px-4 py-2 rounded-lg bg-white border border-neutral-200 text-neutral-900 text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2.5 bg-white hover:bg-neutral-50 text-neutral-700 rounded-lg border border-neutral-200 font-medium text-sm shadow-sm hover:shadow transition-all disabled:opacity-50"
          >
            Agregar
          </button>
        </form>
        <div className="overflow-hidden rounded-lg border border-neutral-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-neutral-50">
                <th className={`${thClass} py-3 px-4`}>Nombre</th>
                <th className={thClass}>Día evento</th>
                <th className={thClass}>Armado</th>
                <th className={thClass}>Des. evento</th>
                <th className={thClass}>Des. depósito</th>
                <th className={thClass}>Guardia</th>
                <th className={thClass}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {utileros.map((u) => (
                <tr key={u.id} className="hover:bg-neutral-50/50 transition-colors">
                  <td className="py-3 px-4 font-medium text-neutral-900">{u.nombre}</td>
                  {editingId === u.id ? (
                    <>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          step="1"
                          value={editForm.tarifaPorDia}
                          onChange={(e) =>
                            setEditForm({ ...editForm, tarifaPorDia: e.target.value })
                          }
                          className={inputClass}
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          step="1"
                          value={editForm.tarifaArmado}
                          onChange={(e) =>
                            setEditForm({ ...editForm, tarifaArmado: e.target.value })
                          }
                          className={inputClass}
                          placeholder="-"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          step="1"
                          value={editForm.tarifaDesarmeEvento}
                          onChange={(e) =>
                            setEditForm({ ...editForm, tarifaDesarmeEvento: e.target.value })
                          }
                          className={inputClass}
                          placeholder="-"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          step="1"
                          value={editForm.tarifaDesarmeDepo}
                          onChange={(e) =>
                            setEditForm({ ...editForm, tarifaDesarmeDepo: e.target.value })
                          }
                          className={inputClass}
                          placeholder="-"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          step="1"
                          value={editForm.tarifaGuardia}
                          onChange={(e) =>
                            setEditForm({ ...editForm, tarifaGuardia: e.target.value })
                          }
                          className={inputClass}
                          placeholder="-"
                        />
                      </td>
                      <td className="py-2 px-2 flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleUpdate(u.id)}
                          disabled={loading}
                          className="px-2 py-1 bg-sky-600 hover:bg-sky-700 text-white text-xs rounded font-medium disabled:opacity-50"
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-2 py-1 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 text-xs rounded font-medium"
                        >
                          Cancelar
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-3 px-2 text-neutral-600 tabular-nums">
                        ${u.tarifaPorDia.toLocaleString("es-AR")}
                      </td>
                      <td className="py-3 px-2 text-neutral-600 tabular-nums">
                        {u.tarifaArmado != null
                          ? `$${u.tarifaArmado.toLocaleString("es-AR")}`
                          : "-"}
                      </td>
                      <td className="py-3 px-2 text-neutral-600 tabular-nums">
                        {u.tarifaDesarmeEvento != null
                          ? `$${u.tarifaDesarmeEvento.toLocaleString("es-AR")}`
                          : "-"}
                      </td>
                      <td className="py-3 px-2 text-neutral-600 tabular-nums">
                        {u.tarifaDesarmeDepo != null
                          ? `$${u.tarifaDesarmeDepo.toLocaleString("es-AR")}`
                          : "-"}
                      </td>
                      <td className="py-3 px-2 text-neutral-600 tabular-nums">
                        {u.tarifaGuardia != null
                          ? `$${u.tarifaGuardia.toLocaleString("es-AR")}`
                          : "-"}
                      </td>
                      <td className="py-3 px-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(u.id);
                            setEditForm({
                              tarifaPorDia: String(u.tarifaPorDia),
                              tarifaArmado: u.tarifaArmado != null ? String(u.tarifaArmado) : "",
                              tarifaDesarmeEvento:
                                u.tarifaDesarmeEvento != null ? String(u.tarifaDesarmeEvento) : "",
                              tarifaDesarmeDepo:
                                u.tarifaDesarmeDepo != null ? String(u.tarifaDesarmeDepo) : "",
                              tarifaGuardia: u.tarifaGuardia != null ? String(u.tarifaGuardia) : "",
                            });
                          }}
                          className="text-sky-600 hover:text-sky-700 text-xs font-medium"
                        >
                          Editar
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
