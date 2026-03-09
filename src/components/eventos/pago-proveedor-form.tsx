"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export function PagoProveedorForm({ eventoId }: { eventoId: string }) {
  const router = useRouter();
  const [proveedores, setProveedores] = useState<Array<{ id: string; nombre: string; rubroId: string; rubro: { id: string; nombre: string } }>>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    proveedorId: "",
    monto: "",
    fecha: new Date().toISOString().slice(0, 10),
    concepto: "",
    metodoPago: "TRANSFERENCIA",
  });

  useEffect(() => {
    fetch("/api/proveedores")
      .then((r) => r.json())
      .then(setProveedores)
      .catch(console.error);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.proveedorId || !form.monto) return;
    setLoading(true);
    try {
      const prov = proveedores.find((p) => p.id === form.proveedorId);
      const res = await fetch("/api/pagos-proveedor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventoId,
          proveedorId: form.proveedorId,
          rubroId: prov!.rubroId,
          monto: parseFloat(form.monto),
          fecha: form.fecha,
          concepto: form.concepto || null,
          metodoPago: form.metodoPago,
        }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      setForm({ ...form, monto: "", concepto: "" });
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
        <label className="block text-xs text-gray-600 mb-1">Proveedor</label>
        <select
          value={form.proveedorId}
          onChange={(e) => setForm({ ...form, proveedorId: e.target.value })}
          required
          className="w-full px-3 py-2 rounded bg-white border border-gray-300 text-gray-900 text-sm"
        >
          <option value="">Seleccionar</option>
          {proveedores.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre} ({p.rubro.nombre})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-600 mb-1">Monto</label>
        <input
          type="number"
          step="0.01"
          value={form.monto}
          onChange={(e) => setForm({ ...form, monto: e.target.value })}
          required
          placeholder="0"
          className="w-28 px-3 py-2 rounded bg-white border border-gray-300 text-gray-900 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-600 mb-1">Fecha</label>
        <input
          type="date"
          value={form.fecha}
          onChange={(e) => setForm({ ...form, fecha: e.target.value })}
          className="px-3 py-2 rounded bg-white border border-gray-300 text-gray-900 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-600 mb-1">Método</label>
        <select
          value={form.metodoPago}
          onChange={(e) => setForm({ ...form, metodoPago: e.target.value })}
          className="px-3 py-2 rounded bg-white border border-gray-300 text-gray-900 text-sm"
        >
          <option value="EFECTIVO">Efectivo</option>
          <option value="TRANSFERENCIA">Transferencia</option>
          <option value="CHEQUE">Cheque</option>
          <option value="OTRO">Otro</option>
        </select>
      </div>
      <div className="min-w-[150px]">
        <label className="block text-xs text-gray-600 mb-1">Concepto</label>
        <input
          type="text"
          value={form.concepto}
          onChange={(e) => setForm({ ...form, concepto: e.target.value })}
          placeholder="Opcional"
          className="w-full px-3 py-2 rounded bg-white border border-gray-300 text-gray-900 text-sm"
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
