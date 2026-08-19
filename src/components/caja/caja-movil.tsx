"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

/**
 * Caja chica pensada para el celular.
 *
 * Cargar un gasto operativo en el evento tiene que ser: elegir la caja, tocar
 * un monto, escribir el concepto y listo. Por eso el selector de evento es lo
 * primero, los controles son grandes y el botón de guardar queda fijo abajo,
 * al alcance del pulgar.
 */

export type CajaEvento = {
  id: string;
  nombre: string;
  cliente: string;
  fecha: string;
  estado: string;
  saldo: number;
  movimientos: {
    id: string;
    monto: number;
    sentido: string;
    metodoPago: string | null;
    concepto: string | null;
    empleadaEncargada: string;
    fecha: string;
  }[];
};

const money = (v: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(v);

const METODOS = [
  { value: "EFECTIVO_ARS", label: "Efectivo ARS" },
  { value: "TRANSF_ARS", label: "Transf. ARS" },
  { value: "EFECTIVO_USD", label: "Efectivo USD" },
  { value: "TRANSF_USD", label: "Transf. USD" },
];

const ctl =
  "h-12 w-full rounded-lg border border-neutral-300 bg-white px-3 text-base text-neutral-900 transition focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-900/10";

export function CajaMovil({
  eventos,
  nombreUsuario,
  eventoInicial,
}: {
  eventos: CajaEvento[];
  nombreUsuario: string;
  eventoInicial?: string;
}) {
  const router = useRouter();
  const [eventoId, setEventoId] = useState(
    eventos.some((e) => e.id === eventoInicial) ? eventoInicial! : (eventos[0]?.id ?? "")
  );
  const [sentido, setSentido] = useState<"EGRESO" | "INGRESO">("EGRESO");
  const [monto, setMonto] = useState("");
  const [concepto, setConcepto] = useState("");
  const [metodoPago, setMetodoPago] = useState("EFECTIVO_ARS");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const caja = useMemo(() => eventos.find((e) => e.id === eventoId), [eventos, eventoId]);

  async function guardar() {
    if (!eventoId) return;
    const valor = Number(monto);
    if (!Number.isFinite(valor) || valor <= 0) {
      setError("Ingresá un monto mayor a cero.");
      return;
    }
    setGuardando(true);
    setError("");
    setOkMsg("");
    try {
      const res = await fetch(`/api/eventos/${eventoId}/movimientos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movimientos: [
            {
              tipo: "CAJA",
              monto,
              metodoPago,
              sentido,
              concepto: concepto || null,
              empleadaEncargada: nombreUsuario,
              fecha: new Date().toISOString().slice(0, 10),
            },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "No se pudo guardar");
      setOkMsg(`${sentido === "EGRESO" ? "Gasto" : "Ingreso"} de ${money(valor)} registrado.`);
      setMonto("");
      setConcepto("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  }

  if (eventos.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-300 bg-white px-6 py-12 text-center">
        <p className="text-sm text-neutral-600">No hay eventos con caja chica disponible.</p>
        <Link
          href="/eventos"
          className="mt-4 inline-flex rounded-md bg-neutral-900 px-4 py-2 text-[13px] font-semibold text-white"
        >
          Ver eventos
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-28">
      {/* Selector de caja: lo primero, porque es lo que más se equivoca */}
      <div className="mb-4">
        <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-neutral-500">
          Caja del evento
        </label>
        <select
          value={eventoId}
          onChange={(e) => setEventoId(e.target.value)}
          className={ctl}
        >
          {eventos.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre} — {e.cliente}
            </option>
          ))}
        </select>
      </div>

      {caja && (
        <div className="mb-5 rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
                Saldo en caja
              </p>
              <p
                className={`mt-0.5 text-2xl font-semibold tabular-nums ${
                  caja.saldo < 0 ? "text-rose-600" : "text-neutral-950"
                }`}
              >
                {money(caja.saldo)}
              </p>
            </div>
            <Link
              href={`/eventos/${caja.id}?s=caja`}
              className="text-[13px] font-semibold text-accent-600"
            >
              Ver evento →
            </Link>
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            {caja.movimientos.length} movimiento{caja.movimientos.length === 1 ? "" : "s"} ·{" "}
            {new Date(caja.fecha).toLocaleDateString("es-AR")}
          </p>
        </div>
      )}

      {/* Alta */}
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="mb-4 grid grid-cols-2 gap-2">
          {(["EGRESO", "INGRESO"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSentido(s)}
              className={`h-11 rounded-lg text-sm font-semibold transition ${
                sentido === s
                  ? s === "EGRESO"
                    ? "bg-rose-600 text-white"
                    : "bg-emerald-600 text-white"
                  : "border border-neutral-300 bg-white text-neutral-600"
              }`}
            >
              {s === "EGRESO" ? "Gasto" : "Reposición"}
            </button>
          ))}
        </div>

        <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-neutral-500">
          Monto
        </label>
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          placeholder="0"
          className={`${ctl} text-right text-xl font-semibold tabular-nums`}
        />

        <div className="mt-3 flex flex-wrap gap-2">
          {[1000, 2000, 5000, 10000, 20000].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setMonto(String((Number(monto) || 0) + v))}
              className="h-9 rounded-md border border-neutral-300 px-3 text-[13px] font-medium text-neutral-700 transition active:bg-neutral-100"
            >
              +{v.toLocaleString("es-AR")}
            </button>
          ))}
          {monto && (
            <button
              type="button"
              onClick={() => setMonto("")}
              className="h-9 rounded-md px-3 text-[13px] font-medium text-neutral-500"
            >
              Borrar
            </button>
          )}
        </div>

        <label className="mb-1.5 mt-4 block text-[11px] font-medium uppercase tracking-wide text-neutral-500">
          Concepto
        </label>
        <input
          value={concepto}
          onChange={(e) => setConcepto(e.target.value)}
          placeholder="Ej: taxi, comida del equipo…"
          className={ctl}
        />

        <label className="mb-1.5 mt-4 block text-[11px] font-medium uppercase tracking-wide text-neutral-500">
          Método
        </label>
        <select
          value={metodoPago}
          onChange={(e) => setMetodoPago(e.target.value)}
          className={ctl}
        >
          {METODOS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>

        {error && <p className="mt-3 text-sm font-medium text-rose-700">{error}</p>}
        {okMsg && <p className="mt-3 text-sm font-medium text-emerald-700">{okMsg}</p>}
      </div>

      {/* Últimos movimientos de la caja elegida */}
      {caja && caja.movimientos.length > 0 && (
        <div className="mt-5 overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <p className="border-b border-neutral-100 px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-neutral-500">
            Últimos movimientos
          </p>
          <ul className="divide-y divide-neutral-100">
            {caja.movimientos.slice(0, 8).map((m) => {
              const esEgreso = m.sentido !== "INGRESO";
              return (
                <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] text-neutral-800">
                      {m.concepto || (esEgreso ? "Gasto" : "Reposición")}
                    </span>
                    <span className="block text-xs text-neutral-400">
                      {new Date(m.fecha).toLocaleDateString("es-AR")} · {m.empleadaEncargada}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 text-[13px] font-semibold tabular-nums ${
                      esEgreso ? "text-rose-600" : "text-emerald-700"
                    }`}
                  >
                    {esEgreso ? "−" : "+"}
                    {money(m.monto)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Guardar fijo abajo: al alcance del pulgar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 p-3 backdrop-blur lg:left-64">
        <button
          type="button"
          onClick={guardar}
          disabled={guardando || !monto}
          className={`flex h-12 w-full items-center justify-center gap-2 rounded-lg text-base font-semibold text-white transition disabled:opacity-40 ${
            sentido === "EGRESO" ? "bg-rose-600" : "bg-emerald-600"
          }`}
        >
          {guardando && <LoadingSpinner className="h-5 w-5 text-white" />}
          {guardando
            ? "Guardando…"
            : `Registrar ${sentido === "EGRESO" ? "gasto" : "reposición"}${
                monto ? ` · ${money(Number(monto) || 0)}` : ""
              }`}
        </button>
      </div>
    </div>
  );
}
