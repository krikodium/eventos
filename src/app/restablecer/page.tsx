"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { PasswordField } from "@/components/auth/password-field";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

function RestablecerForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [state, setState] = useState<"validando" | "listo" | "invalido">("validando");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/auth/restablecer?token=${encodeURIComponent(token)}`)
      .then(async (response) => ({ response, data: await response.json().catch(() => ({})) }))
      .then(({ response, data }) => {
        if (!active) return;
        if (!response.ok) {
          setError(data.error ?? "El enlace no es válido.");
          setState("invalido");
          return;
        }
        setState("listo");
      })
      .catch(() => {
        if (!active) return;
        setError("No pudimos validar el enlace.");
        setState("invalido");
      });
    return () => { active = false; };
  }, [token]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (password !== confirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/auth/restablecer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmation }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "No se pudo cambiar la contraseña.");
      router.push("/login?restablecido=1");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo cambiar la contraseña.");
      setLoading(false);
    }
  }

  return (
    <AuthShell eyebrow="Nueva contraseña" title="Protegé tu cuenta" description="Creá una contraseña nueva para volver a ingresar." sideEyebrow="Seguridad" sideTitle="Un cambio simple para recuperar el control." sideDescription="El token se invalida inmediatamente después de guardar la nueva contraseña.">
      {state === "validando" && <div className="flex flex-col items-center gap-4 py-10"><LoadingSpinner className="h-8 w-8 text-neutral-700" /><p className="text-sm text-neutral-500">Validando enlace...</p></div>}
      {state === "invalido" && <div className="space-y-5"><div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div><Link href="/recuperar" className="flex w-full items-center justify-center rounded-xl bg-neutral-950 px-4 py-3 text-sm font-semibold text-white">Solicitar otro enlace</Link></div>}
      {state === "listo" && <form onSubmit={handleSubmit} className="space-y-5">
        <PasswordField id="password" label="Nueva contraseña" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" placeholder="8+ caracteres" />
        <PasswordField id="confirmation" label="Repetir contraseña" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" />
        <p className="text-xs leading-relaxed text-neutral-500">Usá al menos una mayúscula, una minúscula y un número.</p>
        {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
        <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-60">{loading && <LoadingSpinner className="h-5 w-5 text-white" />}{loading ? "Guardando..." : "Guardar nueva contraseña"}</button>
      </form>}
    </AuthShell>
  );
}

export default function RestablecerPage() {
  return <Suspense fallback={<div className="min-h-screen bg-neutral-50" />}><RestablecerForm /></Suspense>;
}
