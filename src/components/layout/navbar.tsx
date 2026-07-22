"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

type IconName = "inicio" | "eventos" | "presupuestos" | "proveedores" | "utileros" | "reportes" | "usuarios";

function NavIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    inicio: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5M9 21v-7h6v7" /></>,
    eventos: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /><path d="m9 16 2 2 4-5" /></>,
    presupuestos: <><path d="M6 2h9l5 5v15H6z" /><path d="M14 2v6h6M9 13h8M9 17h6" /></>,
    proveedores: <><path d="M3 21h18M5 21V8l7-4 7 4v13" /><path d="M9 21v-6h6v6M9 10h.01M15 10h.01" /></>,
    utileros: <><circle cx="9" cy="7" r="4" /><path d="M2.5 21v-2a6.5 6.5 0 0 1 13 0v2M17 11l2 2 3-4" /></>,
    reportes: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
    usuarios: <><path d="M12 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" /><path d="M3 22a9 9 0 0 1 18 0" /><path d="M18 8h4M20 6v4" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">{paths[name]}</svg>;
}

function NavLink({ href, label, icon, exact = false }: { href: string; label: string; icon: IconName; exact?: boolean }) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link href={href} className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? "bg-[#dcdad4] text-neutral-950 ring-1 ring-neutral-300/80 shadow-sm" : "text-neutral-500 hover:bg-white/70 hover:text-neutral-900"}`}>
      <span className={active ? "text-neutral-900" : "text-neutral-400 transition group-hover:text-neutral-600"}><NavIcon name={icon} /></span>
      <span>{label}</span>
      {active ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-neutral-700" /> : null}
    </Link>
  );
}

export function Navbar() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const permisos = session?.user?.permisos;
  const initials = (session?.user?.name || session?.user?.email || "U").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  return (
    <>
      <aside className="app-sidebar fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-[#dedbd3] bg-[#f0eee8] text-neutral-800 lg:flex">
        <div className="flex h-20 items-center gap-3 border-b border-neutral-100 px-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-300 bg-white text-lg font-light tracking-tight text-neutral-900">HC</span>
          <div><p className="text-sm font-semibold tracking-tight text-neutral-900">Eventos HC</p><p className="mt-0.5 text-[11px] text-neutral-500">Gestión integral</p></div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">Principal</p>
          <div className="space-y-1">
            <NavLink href="/" label="Inicio" icon="inicio" exact />
            <NavLink href="/eventos" label="Eventos" icon="eventos" />
            {(isAdmin || permisos?.navPresupuestos) ? <NavLink href="/presupuestos" label="Presupuestos" icon="presupuestos" /> : null}
          </div>
          {isAdmin ? <>
            <div className="my-5 border-t border-neutral-100" />
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">Administración</p>
            <div className="space-y-1">
              <NavLink href="/proveedores" label="Proveedores" icon="proveedores" />
              <NavLink href="/utileros" label="Utileros" icon="utileros" />
              <NavLink href="/reportes" label="Reportes" icon="reportes" />
              <NavLink href="/usuarios" label="Usuarios" icon="usuarios" />
            </div>
          </> : null}
        </nav>

        <div className="border-t border-neutral-100 p-3">
          <div className="flex items-center gap-3 rounded-xl border border-[#dedbd3] bg-[#f8f6f1] p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-xs font-bold text-white">{initials}</span>
            <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-neutral-900">{session?.user?.name || "Usuario"}</p><p className="mt-0.5 text-[10px] uppercase tracking-wide text-neutral-400">{isAdmin ? "Administrador" : "Operador"}</p></div>
            <button onClick={() => signOut({ callbackUrl: "/login" })} aria-label="Cerrar sesión" title="Cerrar sesión" className="rounded-lg p-2 text-neutral-400 transition hover:bg-neutral-200 hover:text-neutral-700">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M10 17l5-5-5-5M15 12H3M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /></svg>
            </button>
          </div>
        </div>
      </aside>

      <nav className="sticky top-0 z-30 w-full border-b border-[#dedbd3] bg-[#f8f6f1]/95 backdrop-blur lg:hidden">
        <div className="flex h-14 items-center gap-3 px-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-300 bg-white text-sm font-light tracking-tight text-neutral-900">HC</span>
          <div className="min-w-0 flex-1 overflow-x-auto">
            <div className="flex w-max items-center gap-1">
              <Link href="/" className="rounded-lg px-3 py-2 text-xs font-semibold text-neutral-600">Inicio</Link>
              <Link href="/eventos" className="rounded-lg px-3 py-2 text-xs font-semibold text-neutral-600">Eventos</Link>
              {(isAdmin || permisos?.navPresupuestos) ? <Link href="/presupuestos" className="rounded-lg px-3 py-2 text-xs font-semibold text-neutral-600">Presupuestos</Link> : null}
              {isAdmin ? <><Link href="/proveedores" className="rounded-lg px-3 py-2 text-xs font-semibold text-neutral-600">Proveedores</Link><Link href="/utileros" className="rounded-lg px-3 py-2 text-xs font-semibold text-neutral-600">Utileros</Link><Link href="/reportes" className="rounded-lg px-3 py-2 text-xs font-semibold text-neutral-600">Reportes</Link><Link href="/usuarios" className="rounded-lg px-3 py-2 text-xs font-semibold text-neutral-600">Usuarios</Link></> : null}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
