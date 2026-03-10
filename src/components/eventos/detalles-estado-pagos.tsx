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
  presupuestoTotal: number | null;
  presupuestoNro: string | null;
  formaPagoAcordada: string | null;
  honorariosHC: number | null;
  viaticosArmado: number | null;
};

type Ingreso = {
  monto: number;
  tipo: string;
  concepto: string | null;
  fecha: Date;
};

type Props = {
  evento: Evento;
  ingresos: Ingreso[];
};

function Fila({
  label,
  value,
  isMoneda,
}: {
  label: string;
  value: React.ReactNode;
  isMoneda?: boolean;
}) {
  const isEmpty = value === null || value === undefined || value === "";

  return (
    <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
      <td className="py-2.5 px-4 text-slate-500 text-sm font-medium align-middle bg-slate-50/80 w-[45%]">
        {label}
      </td>
      <td
        className={`py-2.5 px-4 text-sm align-middle ${
          isMoneda ? "text-right font-semibold tabular-nums text-slate-900" : "text-slate-800"
        }`}
      >
        {isEmpty ? (
          <span className="text-slate-300">—</span>
        ) : (
          value
        )}
      </td>
    </tr>
  );
}

export function DetallesEstadoPagos({ evento, ingresos }: Props) {
  const anticipo = ingresos
    .filter((i) => i.tipo === "ANTICIPO")
    .reduce((s, i) => s + i.monto, 0);
  const pagosParciales = ingresos
    .filter((i) => i.tipo === "PAGO_PARCIAL")
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
  const facturacion = ingresos
    .filter((i) => i.tipo === "FACTURACION")
    .reduce((s, i) => s + i.monto, 0);

  const totalCobrado = anticipo + pagosParciales.reduce((s, p) => s + p.monto, 0) + facturacion;
  const presupuesto = evento.presupuestoTotal ?? 0;
  const saldoAPagar = Math.max(0, presupuesto - totalCobrado);

  const provinciaLocalidad = [evento.provincia, evento.localidad]
    .filter(Boolean)
    .join(" / ");

  return (
    <div className="grid md:grid-cols-2 gap-4 sm:gap-6 md:items-start">
      {/* DETALLES DEL EVENTO */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-800 border-b border-slate-700">
          <h3 className="font-semibold text-white text-sm uppercase tracking-wider">
            Detalles del evento
          </h3>
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
            <Fila label="Organizadora" value={evento.organizadora} />
            <Fila label="Cliente" value={evento.cliente} />
            <Fila label="Evento" value={evento.nombre} />
            <Fila
              label="Provincia / Localidad"
              value={provinciaLocalidad || undefined}
            />
            <Fila
              label="Honorarios HC"
              value={
                evento.honorariosHC != null
                  ? `$${evento.honorariosHC.toLocaleString("es-AR")}`
                  : null
              }
              isMoneda
            />
            <Fila
              label="Presupuesto total (con honorarios)"
              value={
                evento.presupuestoTotal != null
                  ? `$${evento.presupuestoTotal.toLocaleString("es-AR")}`
                  : null
              }
              isMoneda
            />
            <Fila label="Presupuesto Nº" value={evento.presupuestoNro} />
            <Fila label="Forma de pago acordada" value={evento.formaPagoAcordada} />
            <Fila
              label="Viáticos armado"
              value={
                evento.viaticosArmado != null
                  ? `$${evento.viaticosArmado.toLocaleString("es-AR")}`
                  : null
              }
              isMoneda
            />
          </tbody>
        </table>
      </div>

      {/* ESTADO DE PAGOS (Cobros a clientes) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-800 border-b border-slate-700">
          <h3 className="font-semibold text-white text-sm uppercase tracking-wider">
            Estado de pagos
          </h3>
          <p className="text-slate-300 text-xs mt-0.5">Cobros a clientes</p>
        </div>
        <table className="w-full table-fixed">
          <tbody>
            <Fila
              label="Presupuesto total"
              value={
                presupuesto > 0
                  ? `$${presupuesto.toLocaleString("es-AR")}`
                  : null
              }
              isMoneda
            />
            <Fila
              label="Anticipo"
              value={
                anticipo > 0 ? `$${anticipo.toLocaleString("es-AR")}` : null
              }
              isMoneda
            />
            {pagosParciales.map((p, i) => (
              <Fila
                key={i}
                label={`${i + 2}° Pago`}
                value={`$${p.monto.toLocaleString("es-AR")}`}
                isMoneda
              />
            ))}
            {pagosParciales.length === 0 && (
              <>
                <Fila label="2° Pago" value={null} />
                <Fila label="3° Pago" value={null} />
              </>
            )}
            <Fila
              label="Saldo a pagar"
              value={
                presupuesto > 0
                  ? `$${saldoAPagar.toLocaleString("es-AR")}`
                  : null
              }
              isMoneda
            />
          </tbody>
        </table>
      </div>
    </div>
  );
}
