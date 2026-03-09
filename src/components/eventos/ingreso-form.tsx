"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function IngresoForm({ eventoId }: { eventoId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    monto: "",
    concepto: "",
    fecha: new Date().toISOString().slice(0, 10),
    tipo: "FACTURACION",
    numeroFactura: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.monto) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ingresos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventoId,
          monto: parseFloat(form.monto),
          concepto: form.concepto || null,
          fecha: form.fecha,
          tipo: form.tipo,
          numeroFactura: form.numeroFactura || null,
        }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      setForm({ ...form, monto: "", concepto: "", numeroFactura: "" });
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
        <label className="block text-xs text-gray-600 mb-1">Tipo</label>
        <select
          value={form.tipo}
          onChange={(e) => setForm({ ...form, tipo: e.target.value })}
          className="px-3 py-2 rounded bg-white border border-gray-300 text-gray-900 text-sm"
        >
          <option value="FACTURACION">Facturación</option>
          <option value="ANTICIPO">Anticipo</option>
          <option value="PAGO_PARCIAL">Pago parcial</option>
        </select>
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
      <div className="min-w-[120px]">
        <label className="block text-xs text-gray-600 mb-1">Nº Factura</label>
        <input
          type="text"
          value={form.numeroFactura}
          onChange={(e) => setForm({ ...form, numeroFactura: e.target.value })}
          placeholder="Opcional"
          className="w-full px-3 py-2 rounded bg-white border border-gray-300 text-gray-900 text-sm"
        />
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
