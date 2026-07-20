"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const confirmado = searchParams.get("confirmado") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    if (result?.error) {
      setError("Email o contraseña incorrectos");
      setLoading(false);
      return;
    }

    if (result?.ok) {
      router.push(callbackUrl);
      router.refresh();
    }
    setLoading(false);
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
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">Operación centralizada</p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">Tus eventos, costos y equipos en un solo lugar.</h1>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-neutral-400">Planificá cada fecha con información clara, desde el presupuesto inicial hasta el cierre financiero.</p>
        </div>
        <p className="relative text-xs text-neutral-600">Sistema interno de gestión</p>
      </section>
      <section className="flex items-center justify-center px-4 py-12 sm:px-8">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-7 shadow-xl shadow-neutral-200/50 sm:p-9">
        <div className="mb-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">Acceso seguro</p>
          <h2 className="text-3xl font-semibold tracking-tight text-neutral-950">Bienvenido</h2>
          <p className="mt-2 text-sm text-neutral-500">Ingresá tus credenciales para continuar.</p>
        </div>
        {confirmado && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Cuenta activada. Ya podés iniciar sesión con tu nueva contraseña.
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-semibold text-neutral-600">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 hover:border-neutral-300 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              placeholder="admin@eventos.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-xs font-semibold text-neutral-600">Contraseña</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
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
            {loading ? "Iniciando sesión..." : "Iniciar sesión"}
          </button>
        </form>
      </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-slate-200 border-t-slate-700 rounded-full animate-spin" />
          <p className="text-slate-500">Cargando...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
