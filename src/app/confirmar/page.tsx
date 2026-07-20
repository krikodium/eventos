"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

function ConfirmarForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [estado, setEstado] = useState<"validando" | "listo" | "invalido">("validando");
  const [mensajeInvalido, setMensajeInvalido] = useState("");
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");

  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let activo = true;
    async function validar() {
      if (!token) {
        setEstado("invalido");
        setMensajeInvalido("Falta el token de invitación.");
        return;
      }
      try {
        const res = await fetch(`/api/confirmar?token=${encodeURIComponent(token)}`);
        const data = await res.json().catch(() => ({}));
        if (!activo) return;
        if (!res.ok || !data.ok) {
          setEstado("invalido");
          setMensajeInvalido(data.error ?? "La invitación no es válida.");
          return;
        }
        setEmail(data.email ?? "");
        setNombre(data.name ?? "");
        setEstado("listo");
      } catch {
        if (!activo) return;
        setEstado("invalido");
        setMensajeInvalido("No se pudo validar la invitación. Probá de nuevo.");
      }
    }
    validar();
    return () => {
      activo = false;
    };
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/confirmar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmation }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error ?? "No se pudo activar la cuenta.");
      router.push("/login?confirmado=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al activar la cuenta.");
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-neutral-50 lg:grid-cols-[minmax(380px,0.85fr)_1.15fr]">
      <section className="relative hidden overflow-hidden bg-neutral-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-sky-500/15 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-lg font-black text-neutral-950">HC</span>
          <div><p className="text-sm font-semibold">Eventos HC</p><p className="text-xs text-neutral-500">Gestión integral</p></div>
        </div>
        <div className="relative max-w-lg">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">Activá tu cuenta</p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">Un último paso y estás adentro.</h1>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-neutral-400">Definí tu contraseña para completar el acceso a la plataforma.</p>
        </div>
        <p className="relative text-xs text-neutral-600">Sistema interno de gestión</p>
      </section>
      <section className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-7 shadow-xl shadow-neutral-200/50 sm:p-9">
          {estado === "validando" && (
            <div className="flex flex-col items-center gap-4 py-10">
              <LoadingSpinner className="h-8 w-8 text-neutral-700" />
              <p className="text-sm text-neutral-500">Validando invitación...</p>
            </div>
          )}

          {estado === "invalido" && (
            <div className="py-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-rose-600">Invitación no válida</p>
              <h2 className="text-2xl font-semibold tracking-tight text-neutral-950">No pudimos continuar</h2>
              <p className="mt-3 text-sm text-neutral-600">{mensajeInvalido}</p>
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="mt-6 w-full rounded-xl bg-neutral-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
              >
                Ir al login
              </button>
            </div>
          )}

          {estado === "listo" && (
            <>
              <div className="mb-8">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">Bienvenido{nombre ? `, ${nombre}` : ""}</p>
                <h2 className="text-3xl font-semibold tracking-tight text-neutral-950">Definí tu contraseña</h2>
                <p className="mt-2 text-sm text-neutral-500">
                  Activando la cuenta de <span className="font-medium text-neutral-700">{email}</span>.
                </p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="password" className="mb-1.5 block text-xs font-semibold text-neutral-600">Contraseña</label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition hover:border-neutral-300 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                    placeholder="Mínimo 8 caracteres"
                  />
                </div>
                <div>
                  <label htmlFor="confirmation" className="mb-1.5 block text-xs font-semibold text-neutral-600">Repetir contraseña</label>
                  <input
                    id="confirmation"
                    type="password"
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                    required
                    minLength={8}
                    className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition hover:border-neutral-300 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                  />
                </div>
                {error && <p className="text-rose-600 text-sm">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-60"
                >
                  {loading ? <LoadingSpinner className="h-5 w-5 text-white" /> : null}
                  {loading ? "Activando..." : "Activar cuenta"}
                </button>
              </form>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

export default function ConfirmarPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-neutral-200 border-t-neutral-700 rounded-full animate-spin" />
          <p className="text-neutral-500">Cargando...</p>
        </div>
      </div>
    }>
      <ConfirmarForm />
    </Suspense>
  );
}
