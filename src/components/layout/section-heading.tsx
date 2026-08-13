import type { ReactNode } from "react";

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  actions,
  className = "",
}: SectionHeadingProps) {
  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between ${className}`}>
      <div className="min-w-0">
        {eyebrow ? <p className="section-eyebrow">{eyebrow}</p> : null}
        <h2 className="text-lg font-semibold tracking-[-0.015em] text-neutral-950">{title}</h2>
        {description ? <p className="mt-1 max-w-3xl text-sm leading-relaxed text-neutral-500">{description}</p> : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
