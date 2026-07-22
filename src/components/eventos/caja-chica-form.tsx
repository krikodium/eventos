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

  const saldoPositivo = !faltaTc && (saldoArs as number) >= 0;
  const statsGrid = (
    <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="rounded-xl border border-neutral-200 bg-gradient-to-br from-white to-emerald-50/60 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Ingresos (equiv. ARS)</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-700">
          {!faltaTc ? fmtArs(ingresosArs as number) : "—"}
        </p>
      </div>
      <div className="rounded-xl border border-neutral-200 bg-gradient-to-br from-white to-orange-50/60 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Egresos (equiv. ARS)</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-orange-700">
          {!faltaTc ? fmtArs(egresosArs as number) : "—"}
        </p>
      </div>
      <div className={`rounded-xl border p-4 ${saldoPositivo ? "border-emerald-100 bg-gradient-to-br from-white to-emerald-50" : faltaTc ? "border-neutral-200 bg-neutral-50" : "border-rose-100 bg-gradient-to-br from-white to-rose-50"}`}>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Saldo (equiv. ARS)</p>
        <p className={`mt-1 text-2xl font-bold tabular-nums ${faltaTc ? "text-neutral-400" : saldoPositivo ? "text-emerald-800" : "text-rose-700"}`}>
          {!faltaTc ? fmtArs(saldoArs as number) : "—"}
        </p>
        <p className="mt-1.5 text-xs text-neutral-500">Ingresos menos egresos</p>
      </div>
    </div>
  );

  const formularioCampos = (variant: "admin" | "operativo") => {
    const isAdm = variant === "admin";
    const inputC = isAdm ? inputAdmin : inputOperativo;
    const labelC = isAdm ? labelAdmin : labelOperativo;
    return (
      <>
        <div className="w-full sm:w-auto">
          <label className={labelC}>Movimiento</label>
          <div className="inline-flex gap-1 rounded-xl bg-neutral-100 p-1">
            <button
              type="button"
              onClick={() => setForm({ ...form, sentido: CAJA_SENTIDO_INGRESO })}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                form.sentido === CAJA_SENTIDO_INGRESO ? "bg-white text-emerald-700 shadow-sm" : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              Ingreso
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, sentido: CAJA_SENTIDO_EGRESO })}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                form.sentido === CAJA_SENTIDO_EGRESO ? "bg-white text-rose-700 shadow-sm" : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              Egreso
            </button>
          </div>
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
                className="group relative flex items-start justify-between gap-4 overflow-hidden rounded-xl border border-neutral-200 bg-white px-4 py-3.5 shadow-sm transition-all hover:border-neutral-300 hover:shadow"
              >
                <span className={`absolute inset-y-0 left-0 w-1 ${esEg ? "bg-rose-500" : "bg-emerald-500"}`} />
                <div className="min-w-0 pl-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        esEg ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {esEg ? "Egreso" : "Ingreso"}
                    </span>
                    <span className="font-semibold text-neutral-900">{c.empleadaEncargada}</span>
                  </div>
                  {c.concepto && <p className="mt-0.5 text-sm text-neutral-500">{c.concepto}</p>}
                  <p className="mt-1 text-xs text-neutral-400">
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
                <span className={`shrink-0 font-bold tabular-nums ${esEg ? "text-rose-700" : "text-emerald-700"}`}>
                  {esEg ? "−" : "+"}${c.monto.toLocaleString("es-AR")}
                  <span className="block text-right text-xs font-normal text-neutral-400">
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
