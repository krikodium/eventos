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
      <div className="flex gap-4">
        <button
          onClick={() => setTab("proveedores")}
          className={`px-4 py-2 rounded ${tab === "proveedores" ? "bg-sky-600 text-white" : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"}`}
        >
          Proveedores
        </button>
        <button
          onClick={() => setTab("rubros")}
          className={`px-4 py-2 rounded ${tab === "rubros" ? "bg-sky-600 text-white" : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"}`}
        >
          Rubros
        </button>
      </div>

      {tab === "rubros" && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Agregar rubro</h2>
          <form onSubmit={agregarRubro} className="flex gap-4 mb-6">
            <input
              type="text"
              value={nuevoRubro}
              onChange={(e) => setNuevoRubro(e.target.value)}
              placeholder="Ej: Catering, Música..."
              className="flex-1 px-4 py-2 rounded bg-white border border-gray-300 text-gray-900"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded"
            >
              Agregar
            </button>
          </form>
          <ul className="space-y-2">
            {rubros.map((r) => (
              <li key={r.id} className="text-gray-700">
                {r.nombre}
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "proveedores" && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Agregar proveedor</h2>
          <form onSubmit={agregarProveedor} className="flex flex-wrap gap-4 mb-6">
            <input
              type="text"
              value={nuevoProveedor.nombre}
              onChange={(e) => setNuevoProveedor({ ...nuevoProveedor, nombre: e.target.value })}
              placeholder="Nombre del proveedor"
              className="min-w-[200px] px-4 py-2 rounded bg-white border border-gray-300 text-gray-900"
            />
            <select
              value={nuevoProveedor.rubroId}
              onChange={(e) => setNuevoProveedor({ ...nuevoProveedor, rubroId: e.target.value })}
              className="px-4 py-2 rounded bg-white border border-gray-300 text-gray-900"
            >
              {rubros.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={nuevoProveedor.contacto}
              onChange={(e) => setNuevoProveedor({ ...nuevoProveedor, contacto: e.target.value })}
              placeholder="Contacto (opcional)"
              className="min-w-[150px] px-4 py-2 rounded bg-white border border-gray-300 text-gray-900"
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
                  <th className="py-2">Rubro</th>
                  <th className="py-2">Contacto</th>
                </tr>
              </thead>
              <tbody>
                {proveedores.map((p) => (
                  <tr key={p.id} className="border-b border-gray-200">
                    <td className="py-2 text-gray-900">{p.nombre}</td>
                    <td className="py-2 text-gray-600">{p.rubro.nombre}</td>
                    <td className="py-2 text-gray-500">{p.contacto ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
