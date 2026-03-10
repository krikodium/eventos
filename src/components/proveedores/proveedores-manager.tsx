"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Rubro = { id: string; nombre: string };
type Proveedor = {
  id: string;
  nombre: string;
  rubroId: string;
  rubro: Rubro;
  contacto: string | null;
  cuit: string | null;
};

export function ProveedoresManager() {
  const router = useRouter();
  const [rubros, setRubros] = useState<Rubro[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [tab, setTab] = useState<"rubros" | "proveedores">("proveedores");
  const [nuevoRubro, setNuevoRubro] = useState("");
  const [nuevoProveedor, setNuevoProveedor] = useState({
    nombre: "",
    rubroId: "",
    contacto: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/rubros").then((r) => r.json()),
      fetch("/api/proveedores").then((r) => r.json()),
    ]).then(([r, p]) => {
      setRubros(r);
      setProveedores(p);
      if (r.length > 0 && !nuevoProveedor.rubroId) {
        setNuevoProveedor((prev) => ({ ...prev, rubroId: r[0].id }));
      }
    });
  }, []);

  useEffect(() => {
    if (rubros.length > 0 && !nuevoProveedor.rubroId) {
      setNuevoProveedor((prev) => ({ ...prev, rubroId: rubros[0].id }));
    }
  }, [rubros]);

  async function agregarRubro(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoRubro.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/rubros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nuevoRubro.trim() }),
      });
      if (!res.ok) throw new Error("Error");
      const rubro = await res.json();
      setRubros((prev) => [...prev, rubro]);
      setNuevoRubro("");
      router.refresh();
    } catch {
      setLoading(false);
    }
    setLoading(false);
  }

  async function agregarProveedor(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoProveedor.nombre.trim() || !nuevoProveedor.rubroId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/proveedores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nuevoProveedor.nombre.trim(),
          rubroId: nuevoProveedor.rubroId,
          contacto: nuevoProveedor.contacto.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Error");
      const prov = await res.json();
      const rubro = rubros.find((r) => r.id === prov.rubroId)!;
      setProveedores((prev) => [...prev, { ...prov, rubro }]);
      setNuevoProveedor({ nombre: "", rubroId: rubros[0]?.id ?? "", contacto: "" });
      router.refresh();
    } catch {
      setLoading(false);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setTab("proveedores")}
          className={`px-5 py-3.5 text-sm font-medium transition-colors ${
            tab === "proveedores" ? "text-sky-600 border-b-2 border-sky-600 bg-sky-50/30" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50/50"
          }`}
        >
          Proveedores
        </button>
        <button
          onClick={() => setTab("rubros")}
          className={`px-5 py-3.5 text-sm font-medium transition-colors ${
            tab === "rubros" ? "text-sky-600 border-b-2 border-sky-600 bg-sky-50/30" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50/50"
          }`}
        >
          Rubros
        </button>
      </div>

      {tab === "rubros" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700 bg-slate-800">
            <h2 className="font-semibold text-white text-sm uppercase tracking-wider">Agregar rubro</h2>
            <p className="text-slate-300 text-xs mt-0.5">Categorías para clasificar proveedores</p>
          </div>
          <div className="p-6">
            <form onSubmit={agregarRubro} className="flex gap-4 mb-6">
              <input
                type="text"
                value={nuevoRubro}
                onChange={(e) => setNuevoRubro(e.target.value)}
                placeholder="Ej: Catering, Música..."
                className="flex-1 px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-900"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-200 font-medium text-sm shadow-sm hover:shadow transition-all disabled:opacity-50"
              >
                Agregar
              </button>
            </form>
            <div className="space-y-2">
              {rubros.map((r) => (
                <div key={r.id} className="py-2 px-3 rounded-lg bg-slate-50 hover:bg-slate-100/80 text-slate-700 font-medium">
                  {r.nombre}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "proveedores" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700 bg-slate-800">
            <h2 className="font-semibold text-white text-sm uppercase tracking-wider">Agregar proveedor</h2>
            <p className="text-slate-300 text-xs mt-0.5">Registra proveedores y asígnales un rubro</p>
          </div>
          <div className="p-6">
            <form onSubmit={agregarProveedor} className="flex flex-wrap gap-4 mb-6">
              <input
                type="text"
                value={nuevoProveedor.nombre}
                onChange={(e) => setNuevoProveedor({ ...nuevoProveedor, nombre: e.target.value })}
                placeholder="Nombre del proveedor"
                className="min-w-[200px] px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-900"
              />
              <select
                value={nuevoProveedor.rubroId}
                onChange={(e) => setNuevoProveedor({ ...nuevoProveedor, rubroId: e.target.value })}
                className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-900"
              >
                {rubros.map((r) => (
                  <option key={r.id} value={r.id}>{r.nombre}</option>
                ))}
              </select>
              <input
                type="text"
                value={nuevoProveedor.contacto}
                onChange={(e) => setNuevoProveedor({ ...nuevoProveedor, contacto: e.target.value })}
                placeholder="Contacto (opcional)"
                className="min-w-[150px] px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-900"
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
                    <th className="py-3 px-4">Rubro</th>
                    <th className="py-3 px-4">Contacto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {proveedores.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-800">{p.nombre}</td>
                      <td className="py-3 px-4 text-slate-600">{p.rubro.nombre}</td>
                      <td className="py-3 px-4 text-slate-500">{p.contacto ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
