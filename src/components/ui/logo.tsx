/**
 * Isotipo Caradonti: cuadrado dividido, con la H a la izquierda y la C
 * (arco) a la derecha. Reconstruido como SVG a partir de public/logo-caradonti-fondo.png
 * para que escale, herede `currentColor` y no arrastre un fondo horneado.
 */
export function LogoMark({
  className = "h-6 w-6",
  strokeWidth = 3.2,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="square"
      className={className}
      role="img"
      aria-label="Caradonti"
    >
      {/* Marco */}
      <rect x="10" y="10" width="80" height="80" />
      {/* Montante central */}
      <path d="M50 10V90" />
      {/* Travesaño de la H */}
      <path d="M10 50H50" />
      {/* Arco de la C */}
      <path d="M86 10A40.2 40.2 0 0 0 86 90" />
    </svg>
  );
}

/**
 * Isotipo + nombre. `stacked` lo apila (para pantallas de acceso);
 * por defecto va en línea, para barras y encabezados.
 */
export function Logo({
  className = "",
  markClassName = "h-7 w-7",
  stacked = false,
  subtitle,
}: {
  className?: string;
  markClassName?: string;
  stacked?: boolean;
  subtitle?: string;
}) {
  return (
    <span
      className={`flex ${
        stacked ? "flex-col items-center gap-3" : "flex-row items-center gap-2.5"
      } ${className}`.trim()}
    >
      <LogoMark className={markClassName} />
      <span className={stacked ? "text-center" : ""}>
        <span className="block text-sm font-semibold tracking-[0.18em] text-neutral-900">
          CARADONTI
        </span>
        {subtitle && (
          <span className="mt-0.5 block text-[11px] tracking-normal text-neutral-500">
            {subtitle}
          </span>
        )}
      </span>
    </span>
  );
}
