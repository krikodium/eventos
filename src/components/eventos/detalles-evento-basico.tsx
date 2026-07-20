"use client";

type Evento = {
  nombre: string;
  fecha: Date;
  tipo: string;
  cliente: string;
  descripcion: string | null;
  organizadora: string | null;
  provincia: string | null;
  localidad: string | null;
};

const TIPOS: Record<string, string> = {
  CORPORATIVO: "Corporativo",
  PARTICULAR: "Particular",
};

function Fila({ label, value }: { label: string; value: React.ReactNode }) {
  const isEmpty = value === null || value === undefined || value === "";
  return (
    <tr className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50/50 transition-colors">
      <td className="py-2.5 px-4 text-neutral-500 text-sm font-medium align-middle bg-neutral-50/80 w-[45%]">
        {label}
      </td>
      <td className="py-2.5 px-4 text-sm align-middle text-neutral-800">
        {isEmpty ? <span className="text-neutral-300">—</span> : value}
      </td>
    </tr>
  );
}

export function DetallesEventoBasico({ evento }: { evento: Evento }) {
  const provinciaLocalidad = [evento.provincia, evento.localidad].filter(Boolean).join(" / ");

  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden max-w-2xl">
      <div className="px-5 py-3.5 border-b border-neutral-200 bg-neutral-50">
        <h3 className="font-semibold text-neutral-900 text-sm uppercase tracking-wider">Detalles del evento</h3>
      </div>
      <table className="w-full table-fixed">
        <tbody>
          <Fila
            label="Fecha"
            value={new Date(evento.fecha).toLocaleDateString("es-AR", {
              day: "2-digit",
              month: "2-digit",
              year: "2-digit",
            })}
          />
          <Fila label="Tipo" value={TIPOS[evento.tipo] ?? evento.tipo} />
          <Fila label="Organizadora" value={evento.organizadora} />
          <Fila label="Cliente" value={evento.cliente} />
          <Fila label="Evento" value={evento.nombre} />
          <Fila label="Provincia / Localidad" value={provinciaLocalidad || undefined} />
          <Fila label="Descripción" value={evento.descripcion} />
        </tbody>
      </table>
    </div>
  );
}
