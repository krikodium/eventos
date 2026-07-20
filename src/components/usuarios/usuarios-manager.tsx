"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PERMISO_KEYS,
  permisosLabels,
  resolvePermisos,
  PRESET_OPERATIVO_EVENTOS,
  type EventosPermisos,
} from "@/lib/permisos";

type Usuario = {
  id: string;
  email: string;
  name: string;
  role: string;
  eventosPermisos?: unknown;
  activado?: boolean;
};

export function UsuariosManager({ usuarios }: { usuarios: Usuario[] }) {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    name: "",
    role: "EMPLEADO",
  });
  const [perfilNuevo, setPerfilNuevo] = useState<"estandar" | "operativo">("estandar");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [expandidoId, setExpandidoId] = useState<string | null>(null);
  const [permEdit, setPermEdit] = useState<EventosPermisos | null>(null);
  const [guardandoPermisos, setGuardandoPermisos] = useState(false);
  const [reenviandoId, setReenviandoId] = useState<string | null>(null);

  async function reenviarInvitacion(userId: string) {
    setReenviandoId(userId);
    setAviso("");
    setError("");
    try {
      const res = await fetch(`/api/usuarios/${userId}/reinvitar`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No se pudo reenviar la invitación");
      setAviso("Invitación reenviada por email.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al reenviar");
    } finally {
      setReenviandoId(null);
    }
  }

  function abrirPermisos(u: Usuario) {
    if (u.role === "ADMIN") return;
    setExpandidoId(expandidoId === u.id ? null : u.id);
    setPermEdit(resolvePermisos(u.role, u.eventosPermisos as object | null));
  }

  async function guardarPermisos(userId: string) {
    if (!permEdit) return;
    setGuardandoPermisos(true);
    try {
      const res = await fetch(`/api/usuarios/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventosPermisos: permEdit }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Error al guardar");
      setExpandidoId(null);
      setPermEdit(null);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error");
    } finally {
      setGuardandoPermisos(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setAviso("");
    try {
      const body: Record<string, unknown> = {
        email: form.email,
        name: form.name,
        role: form.role === "ADMIN" ? "ADMIN" : "VENDEDOR",
      };
      if (form.role !== "ADMIN" && perfilNuevo === "operativo") {
        body.eventosPermisos = PRESET_OPERATIVO_EVENTOS;
      }
      const res = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      setAviso(`Invitación enviada a ${form.email}. Debe confirmar su email para activar la cuenta.`);
      setForm({ email: "", name: "", role: "EMPLEADO" });
      setPerfilNuevo("estandar");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al invitar usuario");
    } finally {
      setLoading(false);
    }
  }

  const labels = permisosLabels();

  return (
    <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)] xl:items-start">
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm xl:sticky xl:top-20">
        <div className="border-b border-neutral-100 px-6 py-5">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-600">Nuevo acceso</p>
          <h2 className="text-lg font-semibold tracking-tight text-neutral-900">Invitar usuario</h2>
          <p className="mt-1 text-sm text-neutral-500">Le llega un email para confirmar la cuenta y definir su contraseña.</p>
        </div>
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Nombre</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full px-4 py-2 rounded-lg bg-white border border-neutral-200 text-neutral-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className="w-full px-4 py-2 rounded-lg bg-white border border-neutral-200 text-neutral-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Rol</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-white border border-neutral-200 text-neutral-900"
              >
                <option value="EMPLEADO">Empleado</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            {form.role !== "ADMIN" && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Perfil inicial (eventos)</label>
                <select
                  value={perfilNuevo}
                  onChange={(e) => setPerfilNuevo(e.target.value as "estandar" | "operativo")}
                  className="w-full px-4 py-2 rounded-lg bg-white border border-neutral-200 text-neutral-900"
                >
                  <option value="estandar">Estándar (como vendedor histórico)</option>
                  <option value="operativo">Operativo (cotizaciones, caja chica, utileros — sin presupuestos ni finanzas)</option>
                </select>
              </div>
            )}
            {error && <p className="text-rose-600 text-sm">{error}</p>}
            {aviso && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{aviso}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
            >
              {loading ? "Enviando invitación..." : "Enviar invitación"}
            </button>
          </form>
        </div>
      </div>
      <div className="min-w-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-6 py-5">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-600">Equipo</p>
          <h2 className="text-lg font-semibold tracking-tight text-neutral-900">Usuarios registrados</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Los administradores pueden ajustar permisos del módulo Eventos por usuario (no admin).
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-neutral-900 uppercase tracking-wider bg-neutral-50">
                <th className="py-3 px-6">Nombre</th>
                <th className="py-3 px-6">Email</th>
                <th className="py-3 px-6">Rol</th>
                <th className="py-3 px-6">Estado</th>
                <th className="py-3 px-6 w-40">Permisos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {usuarios.map((u) => (
                <Fragment key={u.id}>
                  <tr className="hover:bg-neutral-50/50 transition-colors">
                    <td className="py-4 px-6 font-medium text-neutral-900">{u.name}</td>
                    <td className="py-4 px-6 text-neutral-600">{u.email}</td>
                    <td className="py-4 px-6 text-neutral-600">{u.role === "ADMIN" ? "Admin" : "Empleado"}</td>
                    <td className="py-4 px-6">
                      {u.activado ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">Activado</span>
                      ) : (
                        <div className="flex flex-col items-start gap-1">
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">Pendiente</span>
                          <button
                            type="button"
                            disabled={reenviandoId === u.id}
                            onClick={() => reenviarInvitacion(u.id)}
                            className="text-xs font-medium text-sky-600 hover:text-sky-800 disabled:opacity-50"
                          >
                            {reenviandoId === u.id ? "Reenviando..." : "Reenviar invitación"}
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      {u.role !== "ADMIN" ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (expandidoId === u.id) {
                              setExpandidoId(null);
                              setPermEdit(null);
                            } else {
                              abrirPermisos(u);
                            }
                          }}
                          className="text-sky-600 hover:text-sky-800 text-xs font-medium"
                        >
                          {expandidoId === u.id ? "Cerrar" : "Editar"}
                        </button>
                      ) : (
                        <span className="text-neutral-400 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                  {expandidoId === u.id && permEdit && u.role !== "ADMIN" && (
                    <tr className="bg-neutral-50/80">
                      <td colSpan={5} className="px-6 py-4">
                        <div className="grid sm:grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-2">
                          {PERMISO_KEYS.map((key) => (
                            <label
                              key={key}
                              className="flex items-start gap-2 text-xs text-neutral-700 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={permEdit[key]}
                                onChange={(e) =>
                                  setPermEdit({ ...permEdit, [key]: e.target.checked })
                                }
                                className="mt-0.5 rounded border-neutral-300"
                              />
                              <span>{labels[key]}</span>
                            </label>
                          ))}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={guardandoPermisos}
                            onClick={() => guardarPermisos(u.id)}
                            className="px-3 py-1.5 bg-neutral-900 text-white rounded-lg text-xs font-medium disabled:opacity-50"
                          >
                            Guardar permisos
                          </button>
                          <button
                            type="button"
                            onClick={() => setPermEdit({ ...PRESET_OPERATIVO_EVENTOS })}
                            className="px-3 py-1.5 bg-violet-100 text-violet-900 rounded-lg text-xs font-medium"
                          >
                            Aplicar perfil operativo
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
