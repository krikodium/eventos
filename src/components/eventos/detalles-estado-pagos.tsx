"use client";

import {
  etiquetasIngresos,
  normalizarTipoIngreso,
  type TipoIngreso,
} from "@/lib/ingresos";

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
  id: string;
  monto: number;
  tipo: string;
  concepto: string | null;
  fecha: Date;
};

type Props = {
  evento: Evento;
  ingresos: Ingreso[];
};

function Row({
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
    <div className="flex items-start justify-between gap-4 px-5 py-3 transition-colors hover:bg-neutral-50/70">
      <dt className="text-sm text-neutral-500">{label}</dt>
      <dd
        className={`text-right text-sm ${
          isMoneda ? "font-semibold tabular-nums text-neutral-900" : "font-medium text-neutral-800"
        }`}
      >
        {isEmpty ? <span className="text-neutral-300">—</span> : value}
      </dd>
    </div>
  );
}

function CardHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div className="border-b border-neutral-100 px-5 py-4">
      <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-600">{eyebrow}</p>
      <h3 className="text-base font-semibold tracking-tight text-neutral-900">{title}</h3>
      {subtitle && <p className="mt-0.5 text-xs text-neutral-500">{subtitle}</p>}
    </div>
  );
}

export function DetallesEstadoPagos({ evento, ingresos }: Props) {
  // El desglose sigue el orden real de cobro: seña, anticipo y luego los pagos
  // numerados. El total suma TODOS los ingresos, sin depender del tipo: antes,
  // un tipo no contemplado quedaba fuera del total cobrado.
  const etiquetaIngreso = etiquetasIngresos(ingresos);
  const porTipo = (t: TipoIngreso) =>
    ingresos.filter((i) => normalizarTipoIngreso(i.tipo) === t);
  const suma = (items: Ingreso[]) => items.reduce((s, i) => s + i.monto, 0);

  const senas = porTipo("SENA");
  const anticipos = porTipo("ANTICIPO");
  const pagos = porTipo("PAGO").sort(
    (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
  );

  const totalCobrado = suma(ingresos);
  const presupuesto = evento.presupuestoTotal ?? 0;
  const saldoAPagar = Math.max(0, presupuesto - totalCobrado);
  const pctCobrado = presupuesto > 0 ? Math.min(100, Math.round((totalCobrado / presupuesto) * 100)) : 0;

  const provinciaLocalidad = [evento.provincia, evento.localidad].filter(Boolean).join(" / ");
  const money = (v: number) => `$${v.toLocaleString("es-AR")}`;

  return (
    <div className="grid gap-4 md:grid-cols-2 md:items-start sm:gap-6">
      {/* DETALLES DEL EVENTO */}
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <CardHeader eyebrow="Ficha" title="Detalles del evento" />
        <dl className="divide-y divide-neutral-100">
          <Row
            label="Fecha"
            value={new Date(evento.fecha).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
          />
          <Row label="Organizadora" value={evento.organizadora} />
          <Row label="Cliente" value={evento.cliente} />
          <Row label="Evento" value={evento.nombre} />
          <Row label="Provincia / Localidad" value={provinciaLocalidad || undefined} />
          <Row label="Honorarios HC" value={evento.honorariosHC != null ? money(evento.honorariosHC) : null} isMoneda />
          <Row label="Presupuesto total (con honorarios)" value={evento.presupuestoTotal != null ? money(evento.presupuestoTotal) : null} isMoneda />
          <Row label="Presupuesto Nº" value={evento.presupuestoNro} />
          <Row label="Forma de pago acordada" value={evento.formaPagoAcordada} />
          <Row label="Viáticos armado" value={evento.viaticosArmado != null ? money(evento.viaticosArmado) : null} isMoneda />
        </dl>
      </div>

      {/* ESTADO DE PAGOS */}
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <CardHeader eyebrow="Cobros a clientes" title="Estado de pagos" />

        {/* Resumen destacado */}
        <div className="border-b border-neutral-100 bg-gradient-to-br from-white to-neutral-50 px-5 py-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">Cobrado</p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums text-emerald-700">{money(totalCobrado)}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">Presupuesto</p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums text-neutral-700">
                {presupuesto > 0 ? money(presupuesto) : "—"}
              </p>
            </div>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all"
              style={{ width: `${pctCobrado}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-neutral-500">{pctCobrado}% cobrado</span>
            <span className="font-medium text-neutral-700">
              Saldo a pagar: <span className="font-bold tabular-nums text-neutral-900">{presupuesto > 0 ? money(saldoAPagar) : "—"}</span>
            </span>
          </div>
        </div>

        {/* Desglose de cobros */}
        <dl className="divide-y divide-neutral-100">
          {senas.length > 0 && <Row label="Seña" value={money(suma(senas))} isMoneda />}
          {anticipos.length > 0 && (
            <Row label="Anticipo" value={money(suma(anticipos))} isMoneda />
          )}
          {pagos.map((p) => (
            <Row key={p.id} label={etiquetaIngreso.get(p.id) ?? "Pago"} value={money(p.monto)} isMoneda />
          ))}
          {ingresos.length === 0 && <Row label="Cobros" value={null} />}
        </dl>
      </div>
    </div>
  );
}
