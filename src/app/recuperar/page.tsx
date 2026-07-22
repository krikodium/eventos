"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function RecuperarPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/recuperar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "No se pudo procesar la solicitud.");
      setMessage(data.message);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo procesar la solicitud.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Recuperar acceso"
      title="Volvé a ingresar"
      description="Te enviaremos un enlace seguro si el email corresponde a una cuenta activa."
      sideEyebrow="Acceso seguro"
      sideTitle="Recuperá tu cuenta sin depender de un administrador."
      sideDescription="El enlace es personal, se puede usar una sola vez y vence automáticamente después de una hora."
    >
      {message ? (
        <div className="space-y-5">
          <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-relaxed text-emerald-800">{message}</div>
          <Link href="/login" className="flex w-full items-center justify-center rounded-xl bg-neutral-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800">Volver al login</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-semibold text-neutral-600">Email</label>
            <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" placeholder="tu@email.com" className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 hover:border-neutral-300 focus:border-sky-500 focus:ring-4 focus:ring-sky-100" />
          </div>
          {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
          <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-60">
            {loading && <LoadingSpinner className="h-5 w-5 text-white" />}
            {loading ? "Enviando..." : "Enviar enlace de recuperación"}
          </button>
          <Link href="/login" className="block text-center text-sm font-medium text-neutral-500 transition hover:text-neutral-900">Volver al login</Link>
        </form>
      )}
    </AuthShell>
  );
}
