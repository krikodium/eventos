"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PERMISO_KEYS,
  permisosLabels,
  resolvePermisos,
  PRESET_OPERATIVO_EVENTOS,
  type EventosPermisos,
} from "@/lib/permisos";

type EstadoAcceso = "ACTIVO" | "PENDIENTE" | "VENCIDO" | "SIN_ACCESO";

type Usuario = {
  id: string;
  email: string;
  name: string;
  role: string;
  eventosPermisos?: unknown;
  estado: EstadoAcceso;
  accesoTemporalExpiraAt: string | null;
  esActual: boolean;
};

type AccesoVisible = {
  nombre: string;
  email: string;
  clave: string;
  expiraAt: string;
};

const ESTADOS: Record<EstadoAcceso, { label: string; className: string }> = {
  ACTIVO: { label: "Activo", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  PENDIENTE: { label: "Pendiente", className: "border-amber-200 bg-amber-50 text-amber-700" },
  VENCIDO: { label: "Clave vencida", className: "border-rose-200 bg-rose-50 text-rose-700" },
  SIN_ACCESO: { label: "Sin acceso", className: "border-neutral-200 bg-neutral-100 text-neutral-600" },
};

function fechaExpiracion(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function UsuariosManager({ usuarios }: { usuarios: Usuario[] }) {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", name: "", role: "EMPLEADO" });
  const [perfilNuevo, setPerfilNuevo] = useState<"estandar" | "operativo">("estandar");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandidoId, setExpandidoId] = useState<string | null>(null);
  const [permEdit, setPermEdit] = useState<EventosPermisos | null>(null);
  const [guardandoPermisos, setGuardandoPermisos] = useState(false);
  const [generandoId, setGenerandoId] = useState<string | null>(null);
  const [accesoVisible, setAccesoVisible] = useState<AccesoVisible | null>(null);
  const [copiado, setCopiado] = useState(false);
  const copiarButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!accesoVisible) return;
    copiarButtonRef.current?.focus();
    function cerrarConEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setAccesoVisible(null);
    }
    window.addEventListener("keydown", cerrarConEscape);
    return () => window.removeEventListener("keydown", cerrarConEscape);
  }, [accesoVisible]);

  function mostrarAcceso(data: {
    usuario: { email: string; name: string | null };
    accesoTemporal: { clave: string; expiraAt: string };
  }) {
    setCopiado(false);
    setAccesoVisible({
      nombre: data.usuario.name || data.usuario.email,
      email: data.usuario.email,
      clave: data.accesoTemporal.clave,
      expiraAt: data.accesoTemporal.expiraAt,
    });
  }

  async function copiarAcceso() {
    if (!accesoVisible) return;
    const url = `${window.location.origin}/activar`;
    await navigator.clipboard.writeText(
      `Acceso a Eventos HC\nEmail: ${accesoVisible.email}\nClave temporal: ${accesoVisible.clave}\nActivar en: ${url}\nVence: ${fechaExpiracion(accesoVisible.expiraAt)}`
    );
    setCopiado(true);
  }

  async function generarNuevoAcceso(usuario: Usuario) {
    if (usuario.esActual) return;
    if (usuario.estado === "ACTIVO") {
      const confirmed = window.confirm(
        `Se cerrará el acceso anterior de ${usuario.name || usuario.email} y deberá elegir una contraseña nueva. ¿Continuar?`
      );
      if (!confirmed) return;
    }

    setGenerandoId(usuario.id);
    setError("");
    try {
      const response = await fetch(`/api/usuarios/${usuario.id}/acceso-temporal`, { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "No se pudo generar la clave temporal.");
      mostrarAcceso(data);
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo generar la clave temporal.");
    } finally {
      setGenerandoId(null);
    }
  }

  function abrirPermisos(usuario: Usuario) {
    if (usuario.role === "ADMIN") return;
    setExpandidoId(expandidoId === usuario.id ? null : usuario.id);
    setPermEdit(resolvePermisos(usuario.role, usuario.eventosPermisos as object | null));
  }

  async function guardarPermisos(userId: string) {
    if (!permEdit) return;
    setGuardandoPermisos(true);
    try {
      const response = await fetch(`/api/usuarios/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventosPermisos: permEdit }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "No se pudieron guardar los permisos.");
      setExpandidoId(null);
      setPermEdit(null);
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudieron guardar los permisos.");
    } finally {
      setGuardandoPermisos(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const body: Record<string, unknown> = { email: form.email, name: form.name, role: form.role };
      if (form.role !== "ADMIN" && perfilNuevo === "operativo") {
        body.eventosPermisos = PRESET_OPERATIVO_EVENTOS;
      }
      const response = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "No se pudo crear el acceso.");
      mostrarAcceso(data);
      setForm({ email: "", name: "", role: "EMPLEADO" });
      setPerfilNuevo("estandar");
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo crear el acceso.");
    } finally {
      setLoading(false);
    }
  }

  const labels = permisosLabels();

  return (
    <>
      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)] xl:items-start">
        <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm xl:sticky xl:top-20">
          <div className="border-b border-neutral-100 px-6 py-5">
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">Nuevo acceso</p>
            <h2 className="text-lg font-semibold tracking-tight text-neutral-900">Crear usuario</h2>
            <p className="mt-1 text-sm leading-relaxed text-neutral-500">El sistema genera una clave temporal que se muestra una sola vez. No se envía ningún email.</p>
          </div>
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="nuevo-nombre" className="mb-1 block text-sm font-medium text-neutral-700">Nombre</label>
                <input id="nuevo-nombre" type="text" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required autoComplete="off" className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-2 text-neutral-900 outline-none focus:border-neutral-500 focus:ring-4 focus:ring-neutral-100" />
              </div>
              <div>
                <label htmlFor="nuevo-email" className="mb-1 block text-sm font-medium text-neutral-700">Email</label>
                <input id="nuevo-email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required autoComplete="off" className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-2 text-neutral-900 outline-none focus:border-neutral-500 focus:ring-4 focus:ring-neutral-100" />
              </div>
              <div>
                <label htmlFor="nuevo-rol" className="mb-1 block text-sm font-medium text-neutral-700">Rol</label>
                <select id="nuevo-rol" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-2 text-neutral-900 outline-none focus:border-neutral-500 focus:ring-4 focus:ring-neutral-100">
                  <option value="EMPLEADO">Empleado</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              {form.role !== "ADMIN" && (
                <div>
                  <label htmlFor="nuevo-perfil" className="mb-1 block text-sm font-medium text-neutral-700">Perfil inicial</label>
                  <select id="nuevo-perfil" value={perfilNuevo} onChange={(event) => setPerfilNuevo(event.target.value as "estandar" | "operativo")} className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-2 text-neutral-900 outline-none focus:border-neutral-500 focus:ring-4 focus:ring-neutral-100">
                    <option value="estandar">Estándar</option>
                    <option value="operativo">Operativo de eventos</option>
                  </select>
                </div>
              )}
              {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
              <button type="submit" disabled={loading} className="w-full rounded-xl bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50">
                {loading ? "Generando acceso..." : "Crear y generar clave"}
              </button>
            </form>
          </div>
        </section>

        <section className="min-w-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-100 px-6 py-5">
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">Equipo</p>
            <h2 className="text-lg font-semibold tracking-tight text-neutral-900">Usuarios registrados</h2>
            <p className="mt-1 text-sm text-neutral-500">Administrá accesos y permisos sin depender de servicios de correo.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wider text-neutral-700">
                  <th className="px-6 py-3">Usuario</th>
                  <th className="px-6 py-3">Rol</th>
                  <th className="px-6 py-3">Acceso</th>
                  <th className="px-6 py-3">Permisos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {usuarios.map((usuario) => {
                  const estado = ESTADOS[usuario.estado];
                  return (
                    <Fragment key={usuario.id}>
                      <tr className="transition-colors hover:bg-neutral-50/70">
                        <td className="px-6 py-4">
                          <p className="font-medium text-neutral-900">{usuario.name}</p>
                          <p className="mt-0.5 text-xs text-neutral-500">{usuario.email}</p>
                        </td>
                        <td className="px-6 py-4 text-neutral-600">{usuario.role === "ADMIN" ? "Administrador" : "Empleado"}</td>
                        <td className="px-6 py-4">
                          <div className="flex min-w-40 flex-col items-start gap-1.5">
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${estado.className}`}>{estado.label}</span>
                            {usuario.estado === "PENDIENTE" && usuario.accesoTemporalExpiraAt && (
                              <span className="text-xs text-neutral-400">Vence {fechaExpiracion(usuario.accesoTemporalExpiraAt)}</span>
                            )}
                            {!usuario.esActual && (
                              <button type="button" disabled={generandoId === usuario.id} onClick={() => generarNuevoAcceso(usuario)} className="text-xs font-semibold text-neutral-700 underline decoration-neutral-300 underline-offset-4 transition hover:text-neutral-950 disabled:opacity-50">
                                {generandoId === usuario.id ? "Generando..." : usuario.estado === "ACTIVO" ? "Restablecer acceso" : "Generar nueva clave"}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {usuario.role !== "ADMIN" ? (
                            <button type="button" onClick={() => { if (expandidoId === usuario.id) { setExpandidoId(null); setPermEdit(null); } else abrirPermisos(usuario); }} className="text-xs font-semibold text-neutral-700 underline decoration-neutral-300 underline-offset-4 transition hover:text-neutral-950">
                              {expandidoId === usuario.id ? "Cerrar" : "Editar"}
                            </button>
                          ) : <span className="text-xs text-neutral-400">—</span>}
                        </td>
                      </tr>
                      {expandidoId === usuario.id && permEdit && usuario.role !== "ADMIN" && (
                        <tr className="bg-neutral-50/80">
                          <td colSpan={4} className="px-6 py-5">
                            <div className="grid max-h-80 gap-3 overflow-y-auto pr-2 sm:grid-cols-2">
                              {PERMISO_KEYS.map((key) => (
                                <label key={key} className="flex cursor-pointer items-start gap-2 text-xs text-neutral-700">
                                  <input type="checkbox" checked={permEdit[key]} onChange={(event) => setPermEdit({ ...permEdit, [key]: event.target.checked })} className="mt-0.5 rounded border-neutral-300" />
                                  <span>{labels[key]}</span>
                                </label>
                              ))}
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                              <button type="button" disabled={guardandoPermisos} onClick={() => guardarPermisos(usuario.id)} className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">Guardar permisos</button>
                              <button type="button" onClick={() => setPermEdit({ ...PRESET_OPERATIVO_EVENTOS })} className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700">Aplicar perfil operativo</button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {accesoVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/45 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setAccesoVisible(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="acceso-title" aria-describedby="acceso-description" className="w-full max-w-lg overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-2xl">
            <div className="border-b border-neutral-100 px-6 py-5 sm:px-7">
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Acceso generado</p>
              <h2 id="acceso-title" className="text-xl font-semibold tracking-tight text-neutral-950">Guardá esta clave ahora</h2>
              <p id="acceso-description" className="mt-1 text-sm leading-relaxed text-neutral-500">Se muestra una sola vez. Al cerrar esta ventana no se puede recuperar; solo generar otra.</p>
            </div>
            <div className="space-y-5 p-6 sm:p-7">
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
                <dl className="space-y-4">
                  <div><dt className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Usuario</dt><dd className="mt-1 text-sm font-medium text-neutral-900">{accesoVisible.nombre}</dd></div>
                  <div><dt className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Email</dt><dd className="mt-1 break-all text-sm text-neutral-700">{accesoVisible.email}</dd></div>
                  <div><dt className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Clave temporal</dt><dd className="mt-2 select-all break-all font-mono text-xl font-semibold tracking-wider text-neutral-950">{accesoVisible.clave}</dd></div>
                </dl>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                Vence el {fechaExpiracion(accesoVisible.expiraAt)}. El usuario debe ingresar en <strong>/activar</strong> y elegir su contraseña personal.
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <button ref={copiarButtonRef} type="button" onClick={copiarAcceso} className="rounded-xl bg-neutral-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800">{copiado ? "Datos copiados" : "Copiar datos de acceso"}</button>
                <button type="button" onClick={() => setAccesoVisible(null)} className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50">Ya guardé la clave</button>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
