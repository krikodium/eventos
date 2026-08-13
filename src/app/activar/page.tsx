"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { PasswordField } from "@/components/auth/password-field";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function ActivarPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [claveTemporal, setClaveTemporal] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmacion, setPasswordConfirmacion] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (password !== passwordConfirmacion) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/acceso-inicial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, claveTemporal, password, passwordConfirmacion }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "No se pudo activar el acceso.");
      router.push("/login?activado=1");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo activar el acceso.");
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Primer acceso"
      title="Activá tu cuenta"
      description="Ingresá los datos que te entregó el administrador y elegí tu contraseña definitiva."
      sideEyebrow="Acceso protegido"
      sideTitle="Una clave de un solo uso para empezar con seguridad."
      sideDescription="La clave temporal vence a las 72 horas y deja de funcionar en cuanto definís tu contraseña personal."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-xs font-semibold text-neutral-600">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
            inputMode="email"
            placeholder="tu@email.com"
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 hover:border-neutral-300 focus:border-accent-500 focus:ring-4 focus:ring-accent-100"
          />
        </div>
        <div>
          <label htmlFor="clave-temporal" className="mb-1.5 block text-xs font-semibold text-neutral-600">Clave temporal</label>
          <input
            id="clave-temporal"
            type="text"
            value={claveTemporal}
            onChange={(event) => setClaveTemporal(event.target.value.toUpperCase())}
            required
            autoComplete="one-time-code"
            spellCheck={false}
            placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 font-mono text-sm uppercase tracking-wider text-neutral-900 outline-none transition placeholder:text-neutral-400 hover:border-neutral-300 focus:border-accent-500 focus:ring-4 focus:ring-accent-100"
          />
        </div>
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs leading-relaxed text-neutral-600">
          Tu nueva contraseña debe tener 12 caracteres o más, con mayúscula, minúscula y número.
        </div>
        <PasswordField id="password" label="Nueva contraseña" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" placeholder="12+ caracteres" />
        <PasswordField id="password-confirmacion" label="Repetir contraseña" value={passwordConfirmacion} onChange={(event) => setPasswordConfirmacion(event.target.value)} autoComplete="new-password" />
        {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
        <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60">
          {loading && <LoadingSpinner className="h-5 w-5 text-white" />}
          {loading ? "Activando acceso..." : "Definir contraseña y activar"}
        </button>
        <Link href="/login" className="block text-center text-sm font-medium text-neutral-500 transition hover:text-neutral-900">Volver al login</Link>
      </form>
    </AuthShell>
  );
}
