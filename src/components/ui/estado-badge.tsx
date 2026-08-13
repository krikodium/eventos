import { estadoEvento, type EstadoTono } from "@/lib/estados";

const TONO_CLASS: Record<EstadoTono, string> = {
  neutral: "badge-neutral",
  accent: "badge-accent",
  success: "badge-success",
  warning: "badge-warning",
  danger: "badge-danger",
};

/** Chip de estado genérico. Usá siempre este, no clases sueltas. */
export function Badge({
  children,
  tono = "neutral",
  dot = false,
}: {
  children: React.ReactNode;
  tono?: EstadoTono;
  dot?: boolean;
}) {
  return (
    <span className={`badge ${TONO_CLASS[tono]}`}>
      {dot && <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  );
}

/** Estado de un evento, con el color que le corresponde en todo el sistema. */
export function EstadoEventoBadge({ estado, dot = false }: { estado: string; dot?: boolean }) {
  const { label, tono } = estadoEvento(estado);
  return (
    <Badge tono={tono} dot={dot}>
      {label}
    </Badge>
  );
}
