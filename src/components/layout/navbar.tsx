"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export function Navbar() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-gray-900 font-semibold">
              Eventos
            </Link>
            <Link href="/eventos" className="text-gray-600 hover:text-gray-900">
              Eventos
            </Link>
            {isAdmin && (
              <>
                <Link href="/proveedores" className="text-gray-600 hover:text-gray-900">
                  Proveedores
                </Link>
                <Link href="/utileros" className="text-gray-600 hover:text-gray-900">
                  Utileros
                </Link>
                <Link href="/reportes" className="text-gray-600 hover:text-gray-900">
                  Reportes
                </Link>
                <Link href="/usuarios" className="text-gray-600 hover:text-gray-900">
                  Usuarios
                </Link>
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-500 text-sm">
              {session?.user?.name} ({session?.user?.role === "ADMIN" ? "Admin" : "Empleado"})
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-gray-500 hover:text-gray-900 text-sm"
            >
              Salir
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
