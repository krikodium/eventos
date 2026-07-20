"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Select } from "@/components/ui/select";
import {
  CAJA_SENTIDO_EGRESO,
  CAJA_SENTIDO_INGRESO,
  cajaSentidoEsEgreso,
  montoCajaEnArs,
  saldoCajaChicaEnArs,
  sumaEgresosCajaChicaEnArs,
  sumaIngresosCajaChicaEnArs,
} from "@/lib/caja-chica-pesos";

const METODO_OPTIONS = [
  { value: "EFECTIVO_ARS", label: "Efectivo ARS" },
  { value: "TRANSF_ARS", label: "Transf. ARS" },
  { value: "EFECTIVO_USD", label: "Efectivo USD" },
  { value: "TRANSF_USD", label: "Transf. USD" },
];

const METODOS_PAGO: Record<string, string> = {
  EFECTIVO_USD: "Efectivo USD",
  EFECTIVO_ARS: "Efectivo ARS",
  TRANSF_ARS: "Transf. ARS",
  TRANSF_USD: "Transf. USD",
};

type Movimiento = {
  id: string;
  monto: number;
  metodoPago?: string | null;
  sentido?: string | null;
  empleadaEncargada: string;
  concepto: string | null;
  fecha: Date;
};

type Props = {
  eventoId: string;
  tipoCambioUsd: number | null | undefined;
  movimientos: Movimiento[];
  nombreUsuario: string;
  esAdmin: boolean;
};

function fmtArs(n: number) {
  return `$${n.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

export function CajaChicaForm({ eventoId, tipoCambioUsd, movimientos, nombreUsuario, esAdmin }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    monto: "",
    metodoPago: "EFECTIVO_ARS",
    sentido: CAJA_SENTIDO_EGRESO,
    empleadaEncargada: nombreUsuario.trim() || "",
    concepto: "",
  });

  const ingresosArs = useMemo(
    () => sumaIngresosCajaChicaEnArs(movimientos, tipoCambioUsd),
    [movimientos, tipoCambioUsd]
  );
  const egresosArs = useMemo(
    () => sumaEgresosCajaChicaEnArs(movimientos, tipoCambioUsd),
    [movimientos, tipoCambioUsd]
  );
  const saldoArs = useMemo(
    () => saldoCajaChicaEnArs(movimientos, tipoCambioUsd),
    [movimientos, tipoCambioUsd]
  );

  const faltaTc = ingresosArs === "FALTA_TC" || egresosArs === "FALTA_TC" || saldoArs === "FALTA_TC";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.monto || !form.empleadaEncargada.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/caja-chica", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventoId,
          monto: parseFloat(form.monto),
          metodoPago: form.metodoPago,
          sentido: form.sentido,
          empleadaEncargada: form.empleadaEncargada.trim(),
          concepto: form.concepto.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Error al guardar");
      }
      setForm({
        monto: "",
        metodoPago: "EFECTIVO_ARS",
        sentido: CAJA_SENTIDO_EGRESO,
        empleadaEncargada: nombreUsuario.trim() || "",
        concepto: "",
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setLoading(false);
    }
  }

  const inputOperativo =
    "w-full px-3 py-2.5 rounded-lg bg-white border border-neutral-200 text-neutral-900 text-sm placeholder:text-neutral-400 focus:ring-2 focus:ring-neutral-200 focus:border-neutral-300";
  const labelOperativo = "block text-xs font-medium text-neutral-600 mb-1.5";

  const inputAdmin =
    "w-full px-3 py-2 rounded-lg bg-white border border-neutral-200 text-neutral-900 text-sm placeholder:text-neutral-400 focus:ring-2 focus:ring-neutral-200 focus:border-neutral-300 transition-colors";
  const labelAdmin = "block text-xs font-medium text-neutral-600 mb-1.5";

  const SENTIDO_OPTIONS = [
    { value: CAJA_SENTIDO_INGRESO, label: "Ingreso a caja" },
    { value: CAJA_SENTIDO_EGRESO, label: "Egreso de caja" },
  ];

  const alertaTcOperativo = faltaTc && (
    <p className="mt-4 text-amber-800 text-sm rounded-lg bg-amber-50 border border-amber-200/80 px-3 py-2.5">
      Hay movimientos en USD y falta el tipo de cambio en el evento. Cargalo arriba en &quot;Tipo cambio USD&quot; para
      ver ingresos, egresos y saldo en pesos.
    </p>
  );

  const alertaTcAdmin = faltaTc && (
    <p className="mt-4 text-amber-800 text-sm rounded-lg bg-amber-50 border border-amber-200/80 px-3 py-2.5">
      Hay movimientos en USD sin tipo de cambio. Definilo arriba en <strong>Tipo cambio USD</strong>.
    </p>
  );

  const statsGrid = (
    <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="rounded-lg bg-neutral-100/90 border border-neutral-200 p-4">
        <p className="text-neutral-600 text-[11px] font-semibold uppercase tracking-wider">Ingresos (equiv. ARS)</p>
        <p className="text-neutral-900 text-2xl font-bold tabular-nums mt-1">
          {!faltaTc ? fmtArs(ingresosArs as number) : "—"}
        </p>
      </div>
      <div className="rounded-lg bg-neutral-100/90 border border-neutral-200 p-4">
        <p className="text-neutral-600 text-[11px] font-semibold uppercase tracking-wider">Egresos (equiv. ARS)</p>
        <p className="text-neutral-900 text-2xl font-bold tabular-nums mt-1">
          {!faltaTc ? fmtArs(egresosArs as number) : "—"}
        </p>
      </div>
      <div className="rounded-lg bg-neutral-50 border border-neutral-200 p-4">
        <p className="text-neutral-600 text-[11px] font-semibold uppercase tracking-wider">Saldo (equiv. ARS)</p>
        <p
          className={`text-2xl font-bold tabular-nums mt-1 ${
            faltaTc ? "text-neutral-400" : "text-neutral-900"
          }`}
        >
          {!faltaTc ? fmtArs(saldoArs as number) : "—"}
        </p>
        <p className="text-neutral-500 text-xs mt-1.5">Ingresos menos egresos</p>
      </div>
    </div>
  );

  const formularioCampos = (variant: "admin" | "operativo") => {
    const isAdm = variant === "admin";
    const inputC = isAdm ? inputAdmin : inputOperativo;
    const labelC = isAdm ? labelAdmin : labelOperativo;
    return (
      <>
        <div className={isAdm ? "w-full sm:w-40" : "w-full sm:w-40"}>
          <label className={labelC}>Tipo</label>
          {isAdm ? (
            <Select
              value={form.sentido}
              onChange={(v) => setForm({ ...form, sentido: v })}
              options={SENTIDO_OPTIONS}
            />
          ) : (
            <select
              value={form.sentido}
              onChange={(e) => setForm({ ...form, sentido: e.target.value })}
              className={inputC}
            >
              {SENTIDO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} className="bg-white text-neutral-900">
                  {o.label}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="w-full sm:w-auto sm:min-w-[100px]">
          <label className={labelC}>Monto</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={form.monto}
            onChange={(e) => setForm({ ...form, monto: e.target.value })}
            required
            placeholder="0"
            className={inputC}
          />
        </div>
        <div className={isAdm ? "w-full sm:w-44" : "w-full sm:w-44"}>
          <label className={labelC}>Método</label>
          {isAdm ? (
            <Select
              value={form.metodoPago}
              onChange={(v) => setForm({ ...form, metodoPago: v })}
              options={METODO_OPTIONS}
            />
          ) : (
            <select
              value={form.metodoPago}
              onChange={(e) => setForm({ ...form, metodoPago: e.target.value })}
              className={inputC}
            >
              {METODO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} className="bg-white text-neutral-900">
                  {o.label}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className={labelC}>Registró</label>
          <input
            type="text"
            value={form.empleadaEncargada}
            onChange={(e) => setForm({ ...form, empleadaEncargada: e.target.value })}
            required
            placeholder="Nombre"
            className={inputC}
          />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className={labelC}>Concepto (opcional)</label>
          <input
            type="text"
            value={form.concepto}
            onChange={(e) => setForm({ ...form, concepto: e.target.value })}
            placeholder="Ej: compra, reposición…"
            className={inputC}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className={
            isAdm
              ? "px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg font-medium text-sm shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2 justify-center xl:shrink-0 min-w-[150px]"
              : "px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg font-medium text-sm shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2 justify-center lg:shrink-0"
          }
        >
          {loading ? <LoadingSpinner className="h-4 w-4" /> : null}
          {loading ? "Guardando…" : "Registrar movimiento"}
        </button>
      </>
    );
  };

  return (
    <div className="space-y-6">
      {esAdmin ? (
        <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-neutral-200 bg-neutral-50">
            <h3 className="font-semibold text-neutral-900 text-sm uppercase tracking-wider">Caja chica</h3>
            <p className="text-neutral-500 text-xs mt-1 max-w-2xl leading-relaxed">
              Movimientos de ingreso y egreso como caja corriente del evento. Los egresos se suman al resumen de gastos
              del evento; los ingresos reparten o reponen la caja.
            </p>
          </div>

          <div className="p-5 sm:p-6">
            {alertaTcAdmin}
            {statsGrid}

            <div className="mt-8 pt-6 border-t border-neutral-100">
              <p className="text-neutral-500 text-[11px] font-semibold uppercase tracking-wider mb-4">
                Nuevo movimiento
              </p>
              <form
                onSubmit={handleSubmit}
                className="flex flex-col xl:flex-row flex-wrap gap-4 xl:items-end"
              >
                {formularioCampos("admin")}
              </form>
              {error && <p className="text-rose-600 text-sm mt-3">{error}</p>}
              {form.metodoPago.endsWith("_USD") && (!tipoCambioUsd || tipoCambioUsd <= 0) && (
                <p className="text-amber-700 text-sm mt-3 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
                  Para USD cargá el tipo de cambio del evento (bloque superior).
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden border border-neutral-200 shadow-sm bg-white">
          <div className="px-6 pt-6 pb-5 border-b border-neutral-100 bg-neutral-50/80">
            <div>
              <p className="text-neutral-500 text-xs font-semibold uppercase tracking-wider">Caja chica</p>
              <h3 className="text-neutral-900 text-lg font-semibold mt-1">Caja del evento</h3>
              <p className="text-neutral-600 text-sm mt-1 max-w-md">
                Registrá ingresos (dinero que entra a la caja) y egresos (gastos). El saldo es la diferencia en pesos
                (USD se convierte con el tipo de cambio del evento).
              </p>
            </div>
            {alertaTcOperativo}
            {statsGrid}
          </div>

          <div className="px-6 pb-6 pt-5">
            <p className="text-neutral-500 text-xs font-semibold uppercase tracking-wider mb-3">Nuevo movimiento</p>
            <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row flex-wrap gap-4 lg:items-end">
              {formularioCampos("operativo")}
            </form>
            {error && <p className="text-rose-600 text-sm mt-3">{error}</p>}
            {form.metodoPago.endsWith("_USD") && (!tipoCambioUsd || tipoCambioUsd <= 0) && (
              <p className="text-amber-700 text-sm mt-3 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
                Para USD hace falta el tipo de cambio del evento (lo carga un administrador arriba).
              </p>
            )}
          </div>
        </div>
      )}

      <div>
        <h4 className="text-sm font-semibold text-neutral-800 mb-3">Movimientos</h4>
        <div className="space-y-2">
          {movimientos.map((c) => {
            const eq = montoCajaEnArs(c.monto, c.metodoPago ?? undefined, tipoCambioUsd);
            const esEg = cajaSentidoEsEgreso(c.sentido);
            return (
              <div
                key={c.id}
                className={`flex justify-between items-start gap-4 py-4 px-4 rounded-xl border transition-colors ${
                  esAdmin
                    ? "bg-white hover:bg-neutral-50/80 border-neutral-200 shadow-sm"
                    : "bg-neutral-50 hover:bg-neutral-100/80 border-neutral-100"
                }`}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border ${
                        esEg
                          ? "bg-neutral-100 text-neutral-700 border-neutral-200"
                          : "bg-neutral-200 text-neutral-800 border-neutral-300"
                      }`}
                    >
                      {esEg ? "Egreso" : "Ingreso"}
                    </span>
                    <span className="font-semibold text-neutral-900">{c.empleadaEncargada}</span>
                  </div>
                  {c.concepto && <p className="text-neutral-500 text-sm mt-0.5">{c.concepto}</p>}
                  <p className="text-neutral-400 text-xs mt-1">
                    {new Date(c.fecha).toLocaleDateString("es-AR")} •{" "}
                    {METODOS_PAGO[c.metodoPago ?? ""] ?? c.metodoPago ?? "—"}
                    {eq !== "FALTA_TC" &&
                      (c.metodoPago ?? "").endsWith("_USD") &&
                      tipoCambioUsd &&
                      tipoCambioUsd > 0 && (
                        <span className="text-neutral-500"> · ≈ {fmtArs(eq)} ARS</span>
                      )}
                  </p>
                </div>
                <span
                  className={`font-bold tabular-nums shrink-0 text-neutral-900`}
                >
                  {esEg ? "−" : "+"}${c.monto.toLocaleString("es-AR")}
                  <span className="block text-xs font-normal text-neutral-500 text-right">
                    {(c.metodoPago ?? "").endsWith("_USD") ? "USD" : "ARS"}
                  </span>
                </span>
              </div>
            );
          })}
          {movimientos.length === 0 && (
            <p
              className={`text-neutral-500 py-8 text-center rounded-xl border border-dashed ${
                esAdmin ? "border-neutral-200 bg-neutral-50/50" : "border-neutral-200"
              }`}
            >
              Todavía no hay movimientos.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
