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
    <header className="mb-8 px-0.5 pt-1">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-500">{eyebrow}</p>
            {status ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-neutral-500">
                <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />
                {status}
              </span>
            ) : null}
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-neutral-950 sm:text-[36px]">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-neutral-500 sm:text-[15px]">{description}</p>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    </header>
  );
}
