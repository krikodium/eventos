import type { ReactNode } from "react";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  sideEyebrow: string;
  sideTitle: string;
  sideDescription: string;
  children: ReactNode;
};

export function AuthShell({
  eyebrow,
  title,
  description,
  sideEyebrow,
  sideTitle,
  sideDescription,
  children,
}: AuthShellProps) {
  return (
    <main className="grid min-h-screen bg-neutral-50 lg:grid-cols-[minmax(400px,0.86fr)_1.14fr]">
      <section className="relative hidden overflow-hidden bg-[#0b0d10] p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-sky-500/15 blur-3xl" />
        <div className="absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-lg font-black text-neutral-950 shadow-xl shadow-white/10">HC</span>
          <div>
            <p className="text-sm font-semibold">Eventos HC</p>
            <p className="text-xs text-neutral-500">Gestión integral</p>
          </div>
        </div>
        <div className="relative max-w-xl">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">{sideEyebrow}</p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">{sideTitle}</h1>
          <p className="mt-5 max-w-lg text-sm leading-relaxed text-neutral-400">{sideDescription}</p>
          <div className="mt-10 grid grid-cols-3 gap-3">
            {["Eventos", "Finanzas", "Equipo"].map((item) => (
              <div key={item} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-medium text-neutral-300">
                {item}
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-neutral-600">Sistema interno · Acceso protegido</p>
      </section>

      <section className="relative flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500 via-cyan-400 to-indigo-500 lg:hidden" />
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-950 text-sm font-black text-white">HC</span>
            <div><p className="text-sm font-semibold text-neutral-950">Eventos HC</p><p className="text-xs text-neutral-500">Gestión integral</p></div>
          </div>
          <div className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-2xl shadow-neutral-200/60 sm:p-9">
            <div className="mb-8">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">{eyebrow}</p>
              <h2 className="text-3xl font-semibold tracking-tight text-neutral-950">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-neutral-500">{description}</p>
            </div>
            {children}
          </div>
          <p className="mt-5 text-center text-xs text-neutral-400">Eventos HC · Sistema interno de gestión</p>
        </div>
      </section>
    </main>
  );
}
