"use client";

import { useMemo, useState } from "react";
import { Select } from "@/components/ui/select";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  CANALES_PAGO,
  CANAL_PAGO_LABEL,
  CANAL_PAGO_LABEL_CORTO,
  aCanalPago,
  type CanalPago,
  type Moneda,
} from "@/lib/presupuestos/canal-pago";
import {
  importesLinea,
  margenPresupuesto,
  repartoPorCanal,
  resumenPresupuesto,
  totalesPorSector,
  type SectorConLineas,
} from "@/lib/presupuestos/importes";

export type LineaDTO = {
  id: string;
  sectorId: string;
  orden: number;
  item: string;
  descripcion: string | null;
  cantidad: number;
  costoUnitario: number;
  precioUnitario: number;
  moneda: string;
  canalPago: string;
  proveedorId: string | null;
  aprobadoCliente: boolean;
  deshabilitado: boolean;
  proveedor?: { id: string; nombre: string } | null;
};

export type SectorDTO = {
  id: string;
  nombre: string;
  orden: number;
  grupoOpcion: string | null;
  elegido: boolean;
  lineas: LineaDTO[];
};

type Proveedor = { id: string; nombre: string };

const money = (v: number, moneda: Moneda = "ARS") =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: moneda,
    maximumFractionDigits: 0,
  }).format(v);

const inputBase =
  "h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900 transition-colors placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-4 focus:ring-neutral-900/10";

const LINEA_VACIA = {
  item: "",
  descripcion: "",
  cantidad: "1",
  costoUnitario: "",
  precioUnitario: "",
  moneda: "ARS",
  canalPago: "EFECTIVO" as CanalPago,
  proveedorId: "",
};

function Money2({ ars, usd }: { ars: number; usd: number }) {
  return (
    <span className="tabular-nums">
      {money(ars)}
      {usd > 0.0001 && <span className="ml-1.5 text-neutral-500">+ {money(usd, "USD")}</span>}
    </span>
  );
}

/** Fila de carga de un ítem dentro de un sector. */
function FormLinea({
  sectorId,
  proveedores,
  onCreada,
}: {
  sectorId: string;
  proveedores: Proveedor[];
  onCreada: (linea: LineaDTO) => void;
}) {
  const [form, setForm] = useState({ ...LINEA_VACIA });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const previo = useMemo(() => {
    const cantidad = Number(form.cantidad) || 0;
    return {
      costo: cantidad * (Number(form.costoUnitario) || 0),
      cliente: cantidad * (Number(form.precioUnitario) || 0),
    };
  }, [form.cantidad, form.costoUnitario, form.precioUnitario]);

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.item.trim()) return;
    setGuardando(true);
    setError("");
    try {
      const res = await fetch(`/api/presupuestos/sectores/${sectorId}/lineas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          proveedorId: form.proveedorId || null,
          descripcion: form.descripcion || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "No se pudo agregar el ítem");
      onCreada(data);
      setForm({ ...LINEA_VACIA });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo agregar el ítem");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={agregar} className="border-t border-neutral-100 bg-neutral-50/70 p-4">
      <div className="grid gap-3 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
            Ítem
          </label>
          <input
            value={form.item}
            onChange={(e) => setForm({ ...form, item: e.target.value })}
            placeholder="Ej: Alquiler de mesas"
            required
            className={inputBase}
          />
        </div>
        <div className="lg:col-span-1">
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
            Cant.
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={form.cantidad}
            onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
            className={inputBase}
          />
        </div>
        <div className="lg:col-span-2">
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
            Costo unit.
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.costoUnitario}
            onChange={(e) => setForm({ ...form, costoUnitario: e.target.value })}
            placeholder="0"
            className={inputBase}
          />
        </div>
        <div className="lg:col-span-2">
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
            Precio cliente
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.precioUnitario}
            onChange={(e) => setForm({ ...form, precioUnitario: e.target.value })}
            placeholder="0"
            className={inputBase}
          />
        </div>
        <div className="lg:col-span-1">
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
            Moneda
          </label>
          <Select
            value={form.moneda}
            onChange={(v) => setForm({ ...form, moneda: v })}
            options={[
              { value: "ARS", label: "ARS" },
              { value: "USD", label: "USD" },
            ]}
          />
        </div>
        <div className="lg:col-span-2">
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
            Canal de pago
          </label>
          <Select
            value={form.canalPago}
            onChange={(v) => setForm({ ...form, canalPago: v as CanalPago })}
            options={CANALES_PAGO.map((c) => ({ value: c, label: CANAL_PAGO_LABEL[c] }))}
          />
        </div>

        <div className="lg:col-span-5">
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
            Descripción <span className="font-normal normal-case">(opcional)</span>
          </label>
          <input
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            placeholder="Detalle para el cliente"
            className={inputBase}
          />
        </div>
        <div className="lg:col-span-4">
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
            Proveedor <span className="font-normal normal-case">(opcional)</span>
          </label>
          <Select
            value={form.proveedorId}
            onChange={(v) => setForm({ ...form, proveedorId: v })}
            options={[
              { value: "", label: "Sin asignar" },
              ...proveedores.map((p) => ({ value: p.id, label: p.nombre })),
            ]}
          />
        </div>
        <div className="flex items-end lg:col-span-3">
          <button
            type="submit"
            disabled={guardando}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
          >
            {guardando && <LoadingSpinner className="h-4 w-4 text-white" />}
            Agregar ítem
          </button>
        </div>
      </div>

      {(previo.costo > 0 || previo.cliente > 0) && (
        <p className="mt-3 text-xs text-neutral-500">
          Este ítem suma <strong className="text-neutral-800">{money(previo.cliente)}</strong> al
          cliente y cuesta <strong className="text-neutral-800">{money(previo.costo)}</strong>
          {previo.cliente > 0 && (
            <> · margen {(((previo.cliente - previo.costo) / previo.cliente) * 100).toFixed(0)}%</>
          )}
        </p>
      )}

      {error && (
        <p className="mt-3 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}
    </form>
  );
}

function FilaLinea({
  linea,
  onBorrar,
  onToggle,
}: {
  linea: LineaDTO;
  onBorrar: (id: string) => void;
  onToggle: (linea: LineaDTO) => void;
}) {
  const { costo, cliente } = importesLinea({
    cantidad: linea.cantidad,
    costoUnitario: linea.costoUnitario,
    precioUnitario: linea.precioUnitario,
    moneda: linea.moneda as Moneda,
    canalPago: linea.canalPago,
    deshabilitado: linea.deshabilitado,
  });
  const canal = aCanalPago(linea.canalPago);

  return (
    <div
      className={`grid grid-cols-12 items-center gap-3 border-t border-neutral-100 px-4 py-3 text-sm transition ${
        linea.deshabilitado ? "bg-neutral-50/60 opacity-55" : "hover:bg-neutral-50/60"
      }`}
    >
      <div className="col-span-12 min-w-0 sm:col-span-4">
        <p
          className={`truncate font-medium text-neutral-900 ${
            linea.deshabilitado ? "line-through" : ""
          }`}
        >
          {linea.item}
        </p>
        <p className="mt-0.5 truncate text-xs text-neutral-500">
          {linea.cantidad} × {money(linea.precioUnitario, linea.moneda as Moneda)}
          {linea.proveedor && ` · ${linea.proveedor.nombre}`}
        </p>
      </div>

      <div className="col-span-4 sm:col-span-2">
        <span className="rounded-md bg-neutral-100 px-2 py-1 text-[11px] font-semibold text-neutral-600">
          {CANAL_PAGO_LABEL_CORTO[canal]}
        </span>
      </div>

      <div className="col-span-4 text-right sm:col-span-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Costo</p>
        <p className="tabular-nums text-neutral-700">{money(costo, linea.moneda as Moneda)}</p>
      </div>

      <div className="col-span-4 text-right sm:col-span-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Cliente</p>
        <p className="font-semibold tabular-nums text-neutral-950">
          {money(cliente, linea.moneda as Moneda)}
        </p>
      </div>

      <div className="col-span-12 flex justify-end gap-3 sm:col-span-2">
        <button
          type="button"
          onClick={() => onToggle(linea)}
          className="text-xs font-semibold text-neutral-500 transition hover:text-neutral-900"
        >
          {linea.deshabilitado ? "Activar" : "Desactivar"}
        </button>
        <button
          type="button"
          onClick={() => onBorrar(linea.id)}
          className="text-xs font-semibold text-rose-600 transition hover:text-rose-700"
        >
          Quitar
        </button>
      </div>
    </div>
  );
}

export function EditorSectores({
  presupuestoId,
  sectoresIniciales,
  proveedores,
}: {
  presupuestoId: string;
  sectoresIniciales: SectorDTO[];
  proveedores: Proveedor[];
}) {
  const [sectores, setSectores] = useState<SectorDTO[]>(sectoresIniciales);
  const [nuevoSector, setNuevoSector] = useState({ nombre: "", grupoOpcion: "" });
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState("");

  const paraCalculo: SectorConLineas[] = useMemo(
    () =>
      sectores.map((s) => ({
        id: s.id,
        nombre: s.nombre,
        grupoOpcion: s.grupoOpcion,
        elegido: s.elegido,
        lineas: s.lineas.map((l) => ({
          cantidad: l.cantidad,
          costoUnitario: l.costoUnitario,
          precioUnitario: l.precioUnitario,
          moneda: l.moneda as Moneda,
          canalPago: l.canalPago,
          deshabilitado: l.deshabilitado,
        })),
      })),
    [sectores]
  );

  const totalesSector = useMemo(() => totalesPorSector(paraCalculo), [paraCalculo]);
  const resumen = useMemo(() => resumenPresupuesto(totalesSector), [totalesSector]);
  const reparto = useMemo(() => repartoPorCanal(paraCalculo), [paraCalculo]);
  const margen = useMemo(() => margenPresupuesto(totalesSector), [totalesSector]);

  async function crearSector(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoSector.nombre.trim()) return;
    setCreando(true);
    setError("");
    try {
      const res = await fetch(`/api/presupuestos/${presupuestoId}/sectores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nuevoSector.nombre,
          grupoOpcion: nuevoSector.grupoOpcion || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "No se pudo crear el sector");
      setSectores((prev) => [...prev, { ...data, lineas: [] }]);
      setNuevoSector({ nombre: "", grupoOpcion: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el sector");
    } finally {
      setCreando(false);
    }
  }

  async function elegirOpcion(sector: SectorDTO) {
    const res = await fetch(`/api/presupuestos/sectores/${sector.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ elegido: !sector.elegido }),
    });
    if (!res.ok) return;
    setSectores((prev) =>
      prev.map((s) => {
        if (s.id === sector.id) return { ...s, elegido: !sector.elegido };
        // El servidor desmarca el resto del grupo; el cliente lo replica.
        if (!sector.elegido && s.grupoOpcion && s.grupoOpcion === sector.grupoOpcion) {
          return { ...s, elegido: false };
        }
        return s;
      })
    );
  }

  async function borrarSector(id: string) {
    const res = await fetch(`/api/presupuestos/sectores/${id}`, { method: "DELETE" });
    if (res.ok) setSectores((prev) => prev.filter((s) => s.id !== id));
  }

  async function borrarLinea(id: string) {
    const res = await fetch(`/api/presupuestos/lineas/${id}`, { method: "DELETE" });
    if (res.ok) {
      setSectores((prev) =>
        prev.map((s) => ({ ...s, lineas: s.lineas.filter((l) => l.id !== id) }))
      );
    }
  }

  async function toggleLinea(linea: LineaDTO) {
    const res = await fetch(`/api/presupuestos/lineas/${linea.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deshabilitado: !linea.deshabilitado }),
    });
    if (!res.ok) return;
    const actualizada = await res.json();
    setSectores((prev) =>
      prev.map((s) => ({
        ...s,
        lineas: s.lineas.map((l) => (l.id === linea.id ? { ...l, ...actualizada } : l)),
      }))
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumen vivo */}
      <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-5 py-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-500">
            Resumen
          </p>
          <h3 className="mt-1 text-base font-semibold text-neutral-950">Totales del presupuesto</h3>
        </div>

        <dl className="grid grid-cols-2 gap-px bg-neutral-200 lg:grid-cols-4">
          {[
            { label: "Total al cliente", valor: resumen.totalVigente, destacado: true },
            { label: "Costo HC", valor: margen.costo, destacado: false },
            { label: "Margen", valor: margen.margen, destacado: false },
          ].map((k) => (
            <div key={k.label} className="bg-white px-4 py-3">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                {k.label}
              </dt>
              <dd
                className={`mt-1 font-semibold ${
                  k.destacado ? "text-lg text-neutral-950" : "text-base text-neutral-700"
                }`}
              >
                <Money2 ars={k.valor.ARS} usd={k.valor.USD} />
              </dd>
            </div>
          ))}
          <div className="bg-white px-4 py-3">
            <dt className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              Margen %
            </dt>
            <dd className="mt-1 text-base font-semibold text-neutral-700">
              {margen.margenPct === null ? "—" : `${margen.margenPct.toFixed(0)}%`}
            </dd>
          </div>
        </dl>

        {/* Reparto por canal: la plata que hay que juntar para pagar */}
        <div className="border-t border-neutral-100 px-5 py-4">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
            Cómo se paga a proveedores
          </p>
          <div className="flex flex-wrap gap-2">
            {CANALES_PAGO.map((canal) => {
              const m = reparto[canal];
              if (m.ARS === 0 && m.USD === 0) return null;
              return (
                <span
                  key={canal}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    canal === "A_DEFINIR"
                      ? "bg-amber-50 text-amber-900"
                      : "bg-neutral-100 text-neutral-800"
                  }`}
                >
                  <span className="text-xs font-semibold">{CANAL_PAGO_LABEL[canal]}</span>{" "}
                  <strong className="font-semibold">
                    <Money2 ars={m.ARS} usd={m.USD} />
                  </strong>
                </span>
              );
            })}
            {Object.values(reparto).every((m) => m.ARS === 0 && m.USD === 0) && (
              <p className="text-sm text-neutral-400">Todavía no hay costos cargados.</p>
            )}
          </div>
        </div>

        {resumen.hayOpciones && (
          <div className="border-t border-neutral-100 bg-neutral-50/60 px-5 py-4">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              Alternativas
            </p>
            <div className="space-y-3">
              {resumen.grupos.map((g) => (
                <div key={g.grupo}>
                  <p className="mb-1.5 text-xs font-semibold text-neutral-700">{g.grupo}</p>
                  <div className="space-y-1">
                    {g.opciones.map((o) => (
                      <div
                        key={o.nombre}
                        className="flex items-center justify-between gap-4 text-sm"
                      >
                        <span
                          className={
                            o.elegido ? "font-semibold text-neutral-950" : "text-neutral-600"
                          }
                        >
                          {o.elegido && "✓ "}
                          {o.nombre}
                        </span>
                        <span className="tabular-nums text-neutral-500">
                          total con base <Money2 ars={o.totalConBase.ARS} usd={o.totalConBase.USD} />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Sectores */}
      {sectores.map((sector) => {
        const total = totalesSector.find((t) => t.id === sector.id);
        return (
          <section
            key={sector.id}
            className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-5 py-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold text-neutral-950">{sector.nombre}</h3>
                  {sector.grupoOpcion && (
                    <span className="rounded-md bg-accent-100 px-2 py-0.5 text-[11px] font-semibold text-accent-800">
                      Alternativa · {sector.grupoOpcion}
                    </span>
                  )}
                  {sector.elegido && (
                    <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                      Elegida
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {sector.lineas.length} {sector.lineas.length === 1 ? "ítem" : "ítems"}
                  {total && (
                    <>
                      {" · cliente "}
                      <Money2 ars={total.cliente.ARS} usd={total.cliente.USD} />
                    </>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {sector.grupoOpcion && (
                  <button
                    type="button"
                    onClick={() => elegirOpcion(sector)}
                    className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50"
                  >
                    {sector.elegido ? "Quitar elección" : "Elegir esta"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => borrarSector(sector.id)}
                  className="text-xs font-semibold text-rose-600 transition hover:text-rose-700"
                >
                  Eliminar sector
                </button>
              </div>
            </div>

            {sector.lineas.map((linea) => (
              <FilaLinea
                key={linea.id}
                linea={linea}
                onBorrar={borrarLinea}
                onToggle={toggleLinea}
              />
            ))}
            {sector.lineas.length === 0 && (
              <p className="border-t border-neutral-100 px-5 py-6 text-center text-sm text-neutral-400">
                Sin ítems todavía.
              </p>
            )}

            <FormLinea
              sectorId={sector.id}
              proveedores={proveedores}
              onCreada={(linea) =>
                setSectores((prev) =>
                  prev.map((s) =>
                    s.id === sector.id ? { ...s, lineas: [...s.lineas, linea] } : s
                  )
                )
              }
            />
          </section>
        );
      })}

      {/* Alta de sector */}
      <form
        onSubmit={crearSector}
        className="rounded-2xl border border-dashed border-neutral-300 bg-white/60 p-5"
      >
        <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
          Nuevo sector
        </p>
        <div className="flex flex-wrap gap-3">
          <input
            value={nuevoSector.nombre}
            onChange={(e) => setNuevoSector({ ...nuevoSector, nombre: e.target.value })}
            placeholder="Ej: Ambientación, Catering..."
            className={`${inputBase} min-w-[220px] flex-1`}
          />
          <input
            value={nuevoSector.grupoOpcion}
            onChange={(e) => setNuevoSector({ ...nuevoSector, grupoOpcion: e.target.value })}
            placeholder="Grupo de alternativas (opcional)"
            className={`${inputBase} min-w-[220px] flex-1`}
          />
          <button
            type="submit"
            disabled={creando}
            className="h-10 rounded-lg bg-neutral-900 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
          >
            Agregar sector
          </button>
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          Los sectores con el mismo grupo son alternativas: no se suman entre sí, se elige una.
        </p>
        {error && (
          <p className="mt-3 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
