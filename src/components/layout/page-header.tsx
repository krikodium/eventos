import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  status?: string;
  actions?: ReactNode;
};

export function PageHeader({ eyebrow, title, description, status, actions }: PageHeaderProps) {
  return (
    <header className="relative mb-6 overflow-hidden rounded-2xl border border-neutral-200 bg-white px-6 py-6 shadow-sm sm:px-7 sm:py-7">
      <div className="pointer-events-none absolute -right-20 -top-28 h-64 w-64 rounded-full bg-sky-100/70 blur-3xl" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-sky-600">{eyebrow}</p>
        <h1 className="text-3xl font-semibold tracking-[-0.025em] text-neutral-950 sm:text-[34px]">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-neutral-500">{description}</p>
      </div>
      {actions ?? (status ? (
        <div className="flex shrink-0 items-center gap-3 rounded-xl border border-neutral-200/80 bg-neutral-50/80 px-4 py-3 text-xs font-semibold text-neutral-600 shadow-sm">
          <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" /></span>
          <div><p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Estado</p><p className="mt-0.5">{status}</p></div>
        </div>
      ) : null)}
      </div>
    </header>
  );
}
