"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { PasswordField } from "@/components/auth/password-field";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedCallback = searchParams.get("callbackUrl") || "/";
  const callbackUrl = requestedCallback.startsWith("/") && !requestedCallback.startsWith("//")
    ? requestedCallback
    : "/";
  const activado = searchParams.get("activado") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
        callbackUrl,
      });
      if (result?.error || !result?.ok) {
        setError("El email o la contraseña no son correctos.");
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("No pudimos iniciar sesión. Probá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Acceso seguro"
      title="Bienvenido"
      description="Ingresá con el email y la contraseña asociados a tu cuenta."
      sideEyebrow="Operación centralizada"
      sideTitle="Tus eventos, costos y equipos en un solo lugar."
      sideDescription="Planificá cada fecha con información clara, desde el presupuesto inicial hasta el cierre financiero."
    >
      {activado && (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-relaxed text-emerald-800">
          Acceso activado. Ya podés ingresar con tu contraseña personal.
        </div>
      )}
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
        <PasswordField id="password" label="Contraseña" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
        {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
        <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60">
          {loading && <LoadingSpinner className="h-5 w-5 text-white" />}
          {loading ? "Iniciando sesión..." : "Iniciar sesión"}
        </button>
      </form>
      <div className="mt-7 border-t border-neutral-100 pt-6 text-center">
        <p className="text-xs leading-relaxed text-neutral-500">¿Tenés una clave temporal o necesitás recuperar el acceso?</p>
        <Link href="/activar" className="mt-2 inline-block text-sm font-semibold text-neutral-800 transition hover:text-neutral-950">Activar con clave temporal</Link>
      </div>
    </AuthShell>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<div className="min-h-screen bg-neutral-50" />}><LoginForm /></Suspense>;
}
