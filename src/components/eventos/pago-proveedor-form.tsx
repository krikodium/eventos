"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Select } from "@/components/ui/select";

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

  const inputClass = "px-3 py-2.5 rounded-lg bg-white border border-neutral-200 text-neutral-900 text-sm focus:ring-2 focus:ring-neutral-200 focus:border-neutral-300 transition-colors placeholder:text-neutral-400";
  const labelClass = "block text-xs font-medium text-neutral-600 mb-1.5";

  const proveedorOptions = proveedores.map((p) => ({
    value: p.id,
    label: `${p.nombre} (${p.rubro.nombre})`,
  }));

  const metodoOptions = [
    { value: "EFECTIVO", label: "Efectivo" },
    { value: "TRANSFERENCIA", label: "Transferencia" },
    { value: "CHEQUE", label: "Cheque" },
    { value: "OTRO", label: "Otro" },
  ];

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-x-5 gap-y-4 items-end p-6 bg-white rounded-xl border border-neutral-200 shadow-sm mb-6">
      <div className="min-w-[200px]">
        <label className={labelClass}>Proveedor</label>
        <Select
          value={form.proveedorId}
          onChange={(v) => setForm({ ...form, proveedorId: v })}
          options={proveedorOptions}
          placeholder="Seleccionar"
          required
        />
      </div>
      <div>
        <label className={labelClass}>Monto</label>
        <input
          type="number"
          step="0.01"
          value={form.monto}
          onChange={(e) => setForm({ ...form, monto: e.target.value })}
          required
          placeholder="0"
          className={`w-28 ${inputClass}`}
        />
      </div>
      <div>
        <label className={labelClass}>Fecha</label>
        <input
          type="date"
          value={form.fecha}
          onChange={(e) => setForm({ ...form, fecha: e.target.value })}
          className={`w-full min-w-[140px] ${inputClass}`}
        />
      </div>
      <div className="min-w-[140px]">
        <label className={labelClass}>Método</label>
        <Select
          value={form.metodoPago}
          onChange={(v) => setForm({ ...form, metodoPago: v })}
          options={metodoOptions}
        />
      </div>
      <div className="min-w-[150px]">
        <label className={labelClass}>Concepto</label>
        <input
          type="text"
          value={form.concepto}
          onChange={(e) => setForm({ ...form, concepto: e.target.value })}
          placeholder="Opcional"
          className={`w-full ${inputClass}`}
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
