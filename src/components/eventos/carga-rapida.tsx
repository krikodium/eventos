"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { TIPO_INGRESO } from "@/lib/ingresos";
import { TIPO_TAREA } from "@/lib/estados";

/**
 * Carga rápida de movimientos del evento.
 *
 * El problema que resuelve: antes había que scrollear hasta el fondo, elegir
 * una pestaña y cargar de a un movimiento por vez. Acá se abre desde una barra
 * fija, se cargan varias filas juntas y se guardan en una sola operación.
 */

export type TipoMov = "INGRESO" | "PROVEEDOR" | "CAJA" | "UTILERO";

type Proveedor = { id: string; nombre: string; rubroId: string };
type Utilero = { id: string; nombre: string; tarifaPorDia: number };

type Fila = {
  key: string;
  tipo: TipoMov;
  monto: string;
  metodoPago: string;
  fecha: string;
  concepto: string;
  // INGRESO
  tipoIngreso: string;
  numeroFactura: string;
  // PROVEEDOR
  proveedorId: string;
  // CAJA
  sentido: string;
  empleadaEncargada: string;
  // UTILERO
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

const TIPOS: { id: TipoMov; label: string; color: string }[] = [
  { id: "INGRESO", label: "Cobro", color: "bg-emerald-600" },
  { id: "PROVEEDOR", label: "Pago a proveedor", color: "bg-rose-600" },
  { id: "CAJA", label: "Caja chica", color: "bg-amber-600" },
  { id: "UTILERO", label: "Utilero", color: "bg-neutral-700" },
];

const input =
  "h-9 w-full rounded-lg border border-neutral-200 bg-white px-2.5 text-sm text-neutral-900 transition placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10";

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
  nombreUsuario,
  permitidos,
}: {
  eventoId: string;
  proveedores: Proveedor[];
  utileros: Utilero[];
  nombreUsuario: string;
  /** Tipos que este usuario puede cargar. */
  permitidos: TipoMov[];
}) {
  const router = useRouter();
  const tiposDisponibles = TIPOS.filter((t) => permitidos.includes(t.id));
  const [abierto, setAbierto] = useState(false);
  const [tipo, setTipo] = useState<TipoMov>(tiposDisponibles[0]?.id ?? "INGRESO");
  const [filas, setFilas] = useState<Fila[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");

  // Al abrir, arranca con una fila lista para escribir.
  useEffect(() => {
    if (abierto && filas.length === 0) {
      setFilas([filaNueva(tipo, nombreUsuario)]);
    }
  }, [abierto, filas.length, tipo, nombreUsuario]);

  // Escape cierra el panel.
  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [abierto]);

  const total = useMemo(
    () => filas.reduce((s, f) => s + (Number(f.monto) || 0), 0),
    [filas]
  );

  function agregarFila() {
    setFilas((prev) => [...prev, filaNueva(tipo, nombreUsuario)]);
  }

  function cambiarTipo(nuevo: TipoMov) {
    setTipo(nuevo);
    // Las filas ya escritas se conservan; las nuevas salen del tipo elegido.
    setFilas((prev) => (prev.length === 1 && !prev[0].monto ? [filaNueva(nuevo, nombreUsuario)] : prev));
  }

  function editar(key: string, campo: keyof Fila, valor: string) {
    setFilas((prev) =>
      prev.map((f) => {
        if (f.key !== key) return f;
        const siguiente = { ...f, [campo]: valor };
        // Al elegir utilero, se sugiere su tarifa como monto.
        if (campo === "utileroId" && !f.monto) {
          const u = utileros.find((x) => x.id === valor);
          if (u) siguiente.monto = String(u.tarifaPorDia);
        }
        return siguiente;
      })
    );
  }

  async function guardar() {
    const utiles = filas.filter((f) => Number(f.monto) > 0);
    if (utiles.length === 0) {
      setError("Cargá al menos un movimiento con monto.");
      return;
    }
    setGuardando(true);
    setError("");
    setOkMsg("");
    try {
      const movimientos = utiles.map((f) => {
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
          return { ...base, proveedorId: f.proveedorId, rubroId: prov?.rubroId ?? "" };
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

      setOkMsg(`${data.cantidad} movimiento${data.cantidad === 1 ? "" : "s"} guardado${data.cantidad === 1 ? "" : "s"}.`);
      setFilas([filaNueva(tipo, nombreUsuario)]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron guardar los movimientos");
    } finally {
      setGuardando(false);
    }
  }

  if (tiposDisponibles.length === 0) return null;

  return (
    <>
      {/* Barra fija: siempre a mano, sin scrollear */}
      <div className="sticky top-0 z-30 -mx-4 mb-6 border-b border-neutral-200 bg-surface-muted/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setAbierto((v) => !v)}
              aria-expanded={abierto}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-neutral-900 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800"
            >
              <span className="text-lg leading-none">{abierto ? "×" : "+"}</span>
              {abierto ? "Cerrar carga" : "Cargar movimientos"}
            </button>
            {!abierto &&
              tiposDisponibles.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTipo(t.id);
                    setFilas([filaNueva(t.id, nombreUsuario)]);
                    setAbierto(true);
                  }}
                  className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50"
                >
                  + {t.label}
                </button>
              ))}
          </div>
          {abierto && filas.length > 0 && (
            <p className="text-sm text-neutral-600">
              {filas.filter((f) => Number(f.monto) > 0).length} en el lote ·{" "}
              <strong className="tabular-nums text-neutral-900">
                ${total.toLocaleString("es-AR")}
              </strong>
            </p>
          )}
        </div>
      </div>

      {abierto && (
        <section className="mb-8 overflow-hidden rounded-2xl border border-neutral-300 bg-white shadow-lg">
          <div className="flex flex-wrap items-center gap-1 border-b border-neutral-100 bg-neutral-50/70 px-4 py-3">
            {tiposDisponibles.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => cambiarTipo(t.id)}
                className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
                  tipo === t.id
                    ? "bg-neutral-900 text-white shadow-sm"
                    : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                }`}
              >
                {t.label}
              </button>
            ))}
            <span className="ml-auto text-xs text-neutral-500">
              Cargá varias filas y guardá todo junto
            </span>
          </div>

          <div className="divide-y divide-neutral-100">
            {filas.map((fila, i) => (
              <div key={fila.key} className="grid grid-cols-12 items-end gap-3 px-4 py-3">
                <div className="col-span-12 flex items-center gap-2 lg:col-span-1">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold text-white ${
                      TIPOS.find((t) => t.id === fila.tipo)?.color ?? "bg-neutral-500"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="text-xs font-semibold text-neutral-500 lg:hidden">
                    {TIPOS.find((t) => t.id === fila.tipo)?.label}
                  </span>
                </div>

                {fila.tipo === "UTILERO" ? (
                  <>
                    <div className="col-span-12 sm:col-span-5 lg:col-span-4">
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                        Utilero
                      </label>
                      <select
                        value={fila.utileroId}
                        onChange={(e) => editar(fila.key, "utileroId", e.target.value)}
                        className={input}
                      >
                        <option value="">Seleccionar…</option>
                        {utileros.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-6 sm:col-span-4 lg:col-span-3">
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                        Tarea
                      </label>
                      <select
                        value={fila.tipoTarea}
                        onChange={(e) => editar(fila.key, "tipoTarea", e.target.value)}
                        className={input}
                      >
                        {Object.entries(TIPO_TAREA).map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-3 lg:col-span-1">
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                        Días
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        value={fila.dias}
                        onChange={(e) => editar(fila.key, "dias", e.target.value)}
                        className={input}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {fila.tipo === "INGRESO" && (
                      <div className="col-span-6 sm:col-span-3 lg:col-span-2">
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                          Tipo
                        </label>
                        <select
                          value={fila.tipoIngreso}
                          onChange={(e) => editar(fila.key, "tipoIngreso", e.target.value)}
                          className={input}
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
                      <div className="col-span-12 sm:col-span-5 lg:col-span-3">
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                          Proveedor
                        </label>
                        <select
                          value={fila.proveedorId}
                          onChange={(e) => editar(fila.key, "proveedorId", e.target.value)}
                          className={input}
                        >
                          <option value="">Seleccionar…</option>
                          {proveedores.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nombre}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {fila.tipo === "CAJA" && (
                      <div className="col-span-6 sm:col-span-3 lg:col-span-2">
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                          Sentido
                        </label>
                        <select
                          value={fila.sentido}
                          onChange={(e) => editar(fila.key, "sentido", e.target.value)}
                          className={input}
                        >
                          <option value="EGRESO">Sale de caja</option>
                          <option value="INGRESO">Entra a caja</option>
                        </select>
                      </div>
                    )}

                    <div className="col-span-6 sm:col-span-3 lg:col-span-2">
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                        Método
                      </label>
                      <select
                        value={fila.metodoPago}
                        onChange={(e) => editar(fila.key, "metodoPago", e.target.value)}
                        className={input}
                      >
                        {METODOS.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-6 sm:col-span-3 lg:col-span-2">
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                        Fecha
                      </label>
                      <input
                        type="date"
                        value={fila.fecha}
                        onChange={(e) => editar(fila.key, "fecha", e.target.value)}
                        className={input}
                      />
                    </div>
                  </>
                )}

                <div className="col-span-6 sm:col-span-3 lg:col-span-2">
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    Monto
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={fila.monto}
                    onChange={(e) => editar(fila.key, "monto", e.target.value)}
                    placeholder="0"
                    className={`${input} font-semibold`}
                  />
                </div>

                {fila.tipo !== "UTILERO" && (
                  <div className="col-span-10 lg:col-span-2">
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                      Concepto
                    </label>
                    <input
                      value={fila.concepto}
                      onChange={(e) => editar(fila.key, "concepto", e.target.value)}
                      placeholder="Opcional"
                      className={input}
                    />
                  </div>
                )}

                <div className="col-span-2 flex justify-end lg:col-span-1">
                  <button
                    type="button"
                    onClick={() => setFilas((prev) => prev.filter((f) => f.key !== fila.key))}
                    aria-label={`Quitar fila ${i + 1}`}
                    className="h-9 rounded-lg px-2 text-lg leading-none text-neutral-400 transition hover:bg-rose-50 hover:text-rose-600"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 bg-neutral-50/70 px-4 py-3">
            <button
              type="button"
              onClick={agregarFila}
              className="h-10 rounded-lg border border-dashed border-neutral-300 px-4 text-sm font-semibold text-neutral-600 transition hover:border-neutral-400 hover:bg-white"
            >
              + Otra fila
            </button>
            <div className="flex items-center gap-3">
              <span className="text-sm text-neutral-600">
                Total lote{" "}
                <strong className="tabular-nums text-neutral-900">
                  ${total.toLocaleString("es-AR")}
                </strong>
              </span>
              <button
                type="button"
                onClick={guardar}
                disabled={guardando}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-neutral-900 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
              >
                {guardando && <LoadingSpinner className="h-4 w-4 text-white" />}
                {guardando ? "Guardando…" : "Guardar todo"}
              </button>
            </div>
          </div>

          {(error || okMsg) && (
            <div className="px-4 pb-4">
              {error && (
                <p className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {error}
                </p>
              )}
              {okMsg && (
                <p className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  {okMsg}
                </p>
              )}
            </div>
          )}
        </section>
      )}
    </>
  );
}
