"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

function NavLink({
  href,
  children,
  exact,
}: {
  href: string;
  children: React.ReactNode;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      className={`px-3 py-2 -mx-3 transition-colors ${
        isActive
          ? "text-slate-900 font-semibold border-b-2 border-slate-900"
          : "text-slate-600 hover:text-slate-900"
      }`}
    >
      {children}
    </Link>
  );
}

export function Navbar() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <nav className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14">
          <div className="flex items-center gap-3">
            <NavLink href="/" exact>
              Inicio
            </NavLink>
            <NavLink href="/eventos">Eventos</NavLink>
            {isAdmin && (
              <>
                <NavLink href="/proveedores">Proveedores</NavLink>
                <NavLink href="/utileros">Utileros</NavLink>
                <NavLink href="/reportes">Reportes</NavLink>
                <NavLink href="/usuarios">Usuarios</NavLink>
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-slate-500 text-sm">
              {session?.user?.name} ({session?.user?.role === "ADMIN" ? "Admin" : "Empleado"})
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-slate-500 hover:text-slate-900 text-sm transition-colors"
            >
              Salir
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
