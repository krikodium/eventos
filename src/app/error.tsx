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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Algo salió mal
        </h1>
        <p className="text-gray-600 mb-6">
          Si las tablas de Eventos no están creadas, ejecuta{" "}
          <code className="text-sm bg-gray-100 px-1 rounded">prisma/eventos-tables.sql</code>{" "}
          en la base de datos.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700"
          >
            Reintentar
          </button>
          <Link
            href="/"
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
          >
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
