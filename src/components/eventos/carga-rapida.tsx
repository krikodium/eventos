"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { TIPO_INGRESO } from "@/lib/ingresos";
import { TIPO_TAREA } from "@/lib/estados";
import { ROL_COMPROMISO, ROL_MOVIMIENTO } from "@/lib/pagos-proveedor-utils";

/**
 * Único punto de carga de movimientos del evento.
 *
 * Antes había dos: este panel y los formularios de alta dentro de cada
 * pestaña. Convive todo acá para no tener dos caminos que hacen lo mismo con
 * validaciones distintas. Las pestañas quedaron para consultar y borrar.
 */

export type TipoMov = "INGRESO" | "PROVEEDOR" | "CAJA" | "UTILERO";

type Proveedor = { id: string; nombre: string; rubroId: string };
type Utilero = { id: string; nombre: string; tarifaPorDia: number };
export type CompromisoOpcion = { id: string; etiqueta: string };

type Fila = {
  key: string;
  tipo: TipoMov;
  monto: string;
  metodoPago: string;
  fecha: string;
  concepto: string;
  tipoIngreso: string;
  numeroFactura: string;
  proveedorId: string;
  rol: string;
  compromisoId: string;
  sentido: string;
  empleadaEncargada: string;
  utileroId: string;
  tipoTarea: string;
  dias: string;
};

const METODOS = [
  { value: "TRANSF_ARS", label: "Transf. ARS" },
  { value: "EFECTIVO_ARS", label: "Efectivo ARS" },
  { value: "TRANSF_USD", label: "Transf. USD" },
  { value: "EFECTIVO_USD", label: "Efectivo USD" },
];

const TIPOS: { id: TipoMov; label: string }[] = [
  { id: "INGRESO", label: "Cobro" },
  { id: "PROVEEDOR", label: "Proveedor" },
  { id: "CAJA", label: "Caja chica" },
  { id: "UTILERO", label: "Utilero" },
];

const ctl =
  "h-8 w-full rounded-md border border-neutral-200 bg-white px-2 text-[13px] text-neutral-900 transition placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10";
const lbl = "mb-1 block text-[10px] font-medium uppercase tracking-wide text-neutral-400";

function filaNueva(tipo: TipoMov, nombreUsuario: string): Fila {
  return {
    key: crypto.randomUUID(),
    tipo,
    monto: "",
    metodoPago: "TRANSF_ARS",
    fecha: new Date().toISOString().slice(0, 10),
    concepto: "",
    tipoIngreso: "PAGO",
    numeroFactura: "",
    proveedorId: "",
    rol: ROL_MOVIMIENTO,
    compromisoId: "",
    sentido: "EGRESO",
    empleadaEncargada: nombreUsuario,
    utileroId: "",
    tipoTarea: "EVENTO",
    dias: "1",
  };
}

export function CargaRapida({
  eventoId,
  proveedores,
  utileros,
  compromisos,
  nombreUsuario,
  permitidos,
  puedeCargarCompromiso,
}: {
  eventoId: string;
  proveedores: Proveedor[];
  utileros: Utilero[];
  compromisos: CompromisoOpcion[];
  nombreUsuario: string;
  permitidos: TipoMov[];
  puedeCargarCompromiso: boolean;
}) {
  const router = useRouter();
  const disponibles = TIPOS.filter((t) => permitidos.includes(t.id));
  const [abierto, setAbierto] = useState(false);
  const [tipo, setTipo] = useState<TipoMov>(disponibles[0]?.id ?? "INGRESO");
  const [filas, setFilas] = useState<Fila[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");

  useEffect(() => {
    if (abierto && filas.length === 0) setFilas([filaNueva(tipo, nombreUsuario)]);
  }, [abierto, filas.length, tipo, nombreUsuario]);

  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [abierto]);

  const cargadas = filas.filter((f) => Number(f.monto) > 0);
  const total = useMemo(
    () => cargadas.reduce((s, f) => s + (Number(f.monto) || 0), 0),
    [cargadas]
  );

  function abrirEn(t: TipoMov) {
    setTipo(t);
    setFilas([filaNueva(t, nombreUsuario)]);
    setAbierto(true);
    setError("");
    setOkMsg("");
  }

  function editar(key: string, campo: keyof Fila, valor: string) {
    setFilas((prev) =>
      prev.map((f) => {
        if (f.key !== key) return f;
        const sig = { ...f, [campo]: valor };
        if (campo === "utileroId" && !f.monto) {
          const u = utileros.find((x) => x.id === valor);
          if (u) sig.monto = String(u.tarifaPorDia);
        }
        // Una cotización no se imputa a otra: al pasar a COMPROMISO se limpia.
        if (campo === "rol" && valor === ROL_COMPROMISO) sig.compromisoId = "";
        return sig;
      })
    );
  }

  async function guardar() {
    if (cargadas.length === 0) {
      setError("Cargá al menos una fila con monto.");
      return;
    }
    setGuardando(true);
    setError("");
    setOkMsg("");
    try {
      const movimientos = cargadas.map((f) => {
        if (f.tipo === "UTILERO") {
          return {
            tipo: "UTILERO",
            utileroId: f.utileroId,
            tipoTarea: f.tipoTarea,
            dias: Number(f.dias) || 1,
            monto: f.monto,
          };
        }
        const base = {
          tipo: f.tipo,
          monto: f.monto,
          metodoPago: f.metodoPago,
          fecha: f.fecha,
          concepto: f.concepto || null,
        };
        if (f.tipo === "INGRESO") {
          return { ...base, tipoIngreso: f.tipoIngreso, numeroFactura: f.numeroFactura || null };
        }
        if (f.tipo === "PROVEEDOR") {
          const prov = proveedores.find((p) => p.id === f.proveedorId);
          return {
            ...base,
            proveedorId: f.proveedorId,
            rubroId: prov?.rubroId ?? "",
            rol: f.rol,
            compromisoId: f.compromisoId || null,
          };
        }
        return { ...base, sentido: f.sentido, empleadaEncargada: f.empleadaEncargada };
      });

      const res = await fetch(`/api/eventos/${eventoId}/movimientos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movimientos }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "No se pudieron guardar los movimientos");

      setOkMsg(`${data.cantidad} registro${data.cantidad === 1 ? "" : "s"} guardado${data.cantidad === 1 ? "" : "s"}.`);
      setFilas([filaNueva(tipo, nombreUsuario)]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron guardar los movimientos");
    } finally {
      setGuardando(false);
    }
  }

  if (disponibles.length === 0) return null;

  return (
    <>
      <div className="sticky top-0 z-30 -mx-4 mb-5 border-b border-neutral-200 bg-surface-muted/95 px-4 py-2.5 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => (abierto ? setAbierto(false) : abrirEn(tipo))}
            aria-expanded={abierto}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-neutral-900 px-4 text-[13px] font-semibold text-white transition hover:bg-neutral-800"
          >
            {abierto ? "Cerrar" : "Registrar movimiento"}
          </button>

          <div className="h-5 w-px bg-neutral-300" aria-hidden />

          {disponibles.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => abrirEn(t.id)}
              className={`h-9 rounded-md px-3 text-[13px] font-medium transition ${
                abierto && tipo === t.id
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-600 hover:bg-neutral-200/60 hover:text-neutral-900"
              }`}
            >
              {t.label}
            </button>
          ))}

          {abierto && cargadas.length > 0 && (
            <p className="ml-auto text-[13px] text-neutral-600">
              {cargadas.length} en el lote ·{" "}
              <strong className="tabular-nums text-neutral-900">
                ${total.toLocaleString("es-AR")}
              </strong>
            </p>
          )}
        </div>
      </div>

      {abierto && (
        <section className="mb-6 overflow-hidden rounded-lg border border-neutral-300 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-neutral-200 px-4 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              Nuevo lote · {TIPOS.find((t) => t.id === tipo)?.label}
            </p>
            <p className="text-[11px] text-neutral-400">
              Cargá varias filas y guardá todo junto
            </p>
          </div>

          <div className="divide-y divide-neutral-100">
            {filas.map((fila, i) => (
              <div
                key={fila.key}
                className="grid grid-cols-12 items-end gap-x-3 gap-y-2 px-4 py-2.5 hover:bg-neutral-50/60"
              >
                <span className="col-span-12 -mb-1 text-[11px] font-medium text-neutral-400 lg:hidden">
                  Fila {i + 1} · {TIPOS.find((t) => t.id === fila.tipo)?.label}
                </span>

                {fila.tipo === "UTILERO" ? (
                  <>
                    <div className="col-span-12 sm:col-span-5 lg:col-span-4">
                      <label className={lbl}>Utilero</label>
                      <select
                        value={fila.utileroId}
                        onChange={(e) => editar(fila.key, "utileroId", e.target.value)}
                        className={ctl}
                      >
                        <option value="">Seleccionar…</option>
                        {utileros.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-7 sm:col-span-4 lg:col-span-4">
                      <label className={lbl}>Tarea</label>
                      <select
                        value={fila.tipoTarea}
                        onChange={(e) => editar(fila.key, "tipoTarea", e.target.value)}
                        className={ctl}
                      >
                        {Object.entries(TIPO_TAREA).map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-5 sm:col-span-3 lg:col-span-2">
                      <label className={lbl}>Días</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        value={fila.dias}
                        onChange={(e) => editar(fila.key, "dias", e.target.value)}
                        className={ctl}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {fila.tipo === "INGRESO" && (
                      <div className="col-span-6 sm:col-span-3 lg:col-span-2">
                        <label className={lbl}>Concepto de cobro</label>
                        <select
                          value={fila.tipoIngreso}
                          onChange={(e) => editar(fila.key, "tipoIngreso", e.target.value)}
                          className={ctl}
                        >
                          {Object.entries(TIPO_INGRESO).map(([v, l]) => (
                            <option key={v} value={v}>
                              {l}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {fila.tipo === "PROVEEDOR" && (
                      <>
                        <div className="col-span-12 sm:col-span-5 lg:col-span-3">
                          <label className={lbl}>Proveedor</label>
                          <select
                            value={fila.proveedorId}
                            onChange={(e) => editar(fila.key, "proveedorId", e.target.value)}
                            className={ctl}
                          >
                            <option value="">Seleccionar…</option>
                            {proveedores.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.nombre}
                              </option>
                            ))}
                          </select>
                        </div>
                        {puedeCargarCompromiso && (
                          <div className="col-span-6 sm:col-span-3 lg:col-span-2">
                            <label className={lbl}>Registrar como</label>
                            <select
                              value={fila.rol}
                              onChange={(e) => editar(fila.key, "rol", e.target.value)}
                              className={ctl}
                            >
                              <option value={ROL_MOVIMIENTO}>Pago realizado</option>
                              <option value={ROL_COMPROMISO}>Cotización</option>
                            </select>
                          </div>
                        )}
                        {fila.rol === ROL_MOVIMIENTO && compromisos.length > 0 && (
                          <div className="col-span-12 sm:col-span-4 lg:col-span-2">
                            <label className={lbl}>Imputar a</label>
                            <select
                              value={fila.compromisoId}
                              onChange={(e) => editar(fila.key, "compromisoId", e.target.value)}
                              className={ctl}
                            >
                              <option value="">Pago suelto</option>
                              {compromisos.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.etiqueta}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </>
                    )}

                    {fila.tipo === "CAJA" && (
                      <div className="col-span-6 sm:col-span-3 lg:col-span-2">
                        <label className={lbl}>Sentido</label>
                        <select
                          value={fila.sentido}
                          onChange={(e) => editar(fila.key, "sentido", e.target.value)}
                          className={ctl}
                        >
                          <option value="EGRESO">Sale de caja</option>
                          <option value="INGRESO">Entra a caja</option>
                        </select>
                      </div>
                    )}

                    <div className="col-span-6 sm:col-span-3 lg:col-span-2">
                      <label className={lbl}>Método</label>
                      <select
                        value={fila.metodoPago}
                        onChange={(e) => editar(fila.key, "metodoPago", e.target.value)}
                        className={ctl}
                      >
                        {METODOS.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-6 sm:col-span-3 lg:col-span-2">
                      <label className={lbl}>Fecha</label>
                      <input
                        type="date"
                        value={fila.fecha}
                        onChange={(e) => editar(fila.key, "fecha", e.target.value)}
                        className={ctl}
                      />
                    </div>
                  </>
                )}

                <div className="col-span-6 sm:col-span-3 lg:col-span-2">
                  <label className={lbl}>Monto</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={fila.monto}
                    onChange={(e) => editar(fila.key, "monto", e.target.value)}
                    placeholder="0"
                    className={`${ctl} text-right font-semibold tabular-nums`}
                  />
                </div>

                {fila.tipo !== "UTILERO" && (
                  <div className="col-span-10 lg:col-span-3">
                    <label className={lbl}>Concepto</label>
                    <input
                      value={fila.concepto}
                      onChange={(e) => editar(fila.key, "concepto", e.target.value)}
                      placeholder="Opcional"
                      className={ctl}
                    />
                  </div>
                )}

                <div className="col-span-2 flex justify-end lg:col-span-1">
                  <button
                    type="button"
                    onClick={() => setFilas((prev) => prev.filter((f) => f.key !== fila.key))}
                    aria-label={`Quitar fila ${i + 1}`}
                    disabled={filas.length === 1}
                    className="h-8 rounded-md px-2 text-neutral-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-400"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 bg-neutral-50/70 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFilas((prev) => [...prev, filaNueva(tipo, nombreUsuario)])}
                className="h-8 rounded-md border border-neutral-300 px-3 text-[13px] font-medium text-neutral-700 transition hover:bg-white"
              >
                + Fila
              </button>
              {disponibles.length > 1 && (
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as TipoMov)}
                  aria-label="Tipo de la próxima fila"
                  className="h-8 rounded-md border border-neutral-300 bg-white px-2 text-[13px] text-neutral-700"
                >
                  {disponibles.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center gap-4">
              <span className="text-[13px] text-neutral-600">
                Total{" "}
                <strong className="tabular-nums text-neutral-900">
                  ${total.toLocaleString("es-AR")}
                </strong>
              </span>
              <button
                type="button"
                onClick={guardar}
                disabled={guardando || cargadas.length === 0}
                className="inline-flex h-8 items-center gap-2 rounded-md bg-neutral-900 px-4 text-[13px] font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-40"
              >
                {guardando && <LoadingSpinner className="h-3.5 w-3.5 text-white" />}
                {guardando ? "Guardando…" : `Guardar ${cargadas.length || ""}`}
              </button>
            </div>
          </div>

          {(error || okMsg) && (
            <div className="border-t border-neutral-200 px-4 py-2.5">
              {error && <p className="text-[13px] font-medium text-rose-700">{error}</p>}
              {okMsg && <p className="text-[13px] font-medium text-emerald-700">{okMsg}</p>}
            </div>
          )}
        </section>
      )}
    </>
  );
}
