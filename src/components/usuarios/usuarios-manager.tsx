"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Usuario = { id: string; email: string; name: string; role: string };

export function UsuariosManager({ usuarios }: { usuarios: Usuario[] }) {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    role: "EMPLEADO",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      setForm({ email: "", password: "", name: "", role: "EMPLEADO" });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear usuario");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700 bg-slate-800">
          <h2 className="font-semibold text-white text-sm uppercase tracking-wider">Crear usuario</h2>
          <p className="text-slate-300 text-xs mt-0.5">Agrega nuevos usuarios al sistema</p>
        </div>
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className="w-full px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={6}
                className="w-full px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-900"
              >
                <option value="EMPLEADO">Empleado</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            {error && <p className="text-rose-600 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-200 font-medium text-sm shadow-sm hover:shadow transition-all disabled:opacity-50"
            >
              Crear usuario
            </button>
          </form>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700 bg-slate-800">
          <h2 className="font-semibold text-white text-sm uppercase tracking-wider">Usuarios registrados</h2>
          <p className="text-slate-300 text-xs mt-0.5">Listado de usuarios del sistema</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-slate-900 uppercase tracking-wider bg-slate-50">
                <th className="py-3 px-6">Nombre</th>
                <th className="py-3 px-6">Email</th>
                <th className="py-3 px-6">Rol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usuarios.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-6 font-medium text-slate-900">{u.name}</td>
                  <td className="py-4 px-6 text-slate-600">{u.email}</td>
                  <td className="py-4 px-6 text-slate-600">{u.role === "ADMIN" ? "Admin" : "Empleado"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
