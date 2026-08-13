"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Server/render error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="panel w-full max-w-md px-6 py-8 text-center">
        <p className="section-eyebrow">Error</p>
        <h1 className="mb-2 text-2xl font-semibold tracking-[-0.025em] text-neutral-950">
          Algo salió mal
        </h1>
        <p className="mb-6 text-sm leading-relaxed text-neutral-500">
          Si las tablas de Eventos no están creadas, ejecutá{" "}
          <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-700">
            prisma/eventos-tables.sql
          </code>{" "}
          en la base de datos.
        </p>
        <div className="flex justify-center gap-3">
          <button onClick={() => reset()} className="btn btn-primary">
            Reintentar
          </button>
          <Link href="/" className="btn btn-secondary">
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
