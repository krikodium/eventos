"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { UtilerosCatalogo } from "./utileros-catalogo";

type Evento = {
  id: string;
  nombre: string;
  fecha: Date;
  cliente: string;
  tipo: string;
  diasUtileros: Array<{
    id: string;
    dias: number;
    monto: number;
    tipo: string;
    utilero: { nombre: string; tarifaPorDia: number };
  }>;
};

const TIPOS_LABEL: Record<string, string> = {
  ARMADO: "Armado",
  ARMADO_1: "Armado 1",
  ARMADO_2: "Armado 2",
  GUARDIA: "Guardia",
  EVENTO: "Día evento",
  DESARME_EVENTO: "Desarme evento",
  DESARME_DEPO: "Desarme depósito",
};

export function UtilerosPorEvento() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/eventos?conUtileros=1")
      .then((r) => r.json())
      .then(setEventos)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-neutral-500">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {eventos.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center shadow-sm">
          <p className="text-neutral-500 mb-4">No hay eventos</p>
          <Link href="/eventos/nuevo" className="text-sky-600 hover:text-sky-700 font-medium">
            Crear evento
          </Link>
        </div>
      ) : (
        <div className="grid gap-6">
          {eventos.map((evento) => {
            const totalUtileros = evento.diasUtileros.reduce((s, d) => s + d.monto, 0);
            const porTipo = evento.diasUtileros.reduce(
              (acc, d) => {
                const t = d.tipo ?? "EVENTO";
                acc[t] = (acc[t] ?? 0) + d.monto;
                return acc;
              },
              {} as Record<string, number>
            );

            return (
              <div key={evento.id} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
                <div className="flex flex-col justify-between gap-4 bg-neutral-950 px-6 py-5 text-white sm:flex-row sm:items-center">
                  <div>
                    <h3 className="font-semibold text-white">{evento.nombre}</h3>
                    <p className="mt-1 text-sm text-neutral-400">
                      {evento.cliente} •{" "}
                      {new Date(evento.fecha).toLocaleDateString("es-AR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-semibold text-white tabular-nums">
                      ${totalUtileros.toLocaleString("es-AR")}
                    </span>
                    <Link
                      href={`/eventos/${evento.id}`}
                      className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-neutral-200 transition hover:bg-white/15 hover:text-white"
                    >
                      Cargar datos →
                    </Link>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                    {Object.entries(porTipo).map(([tipo, monto]) => (
                      <div key={tipo} className="rounded-xl border border-neutral-100 bg-neutral-50 p-3">
                        <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">
                          {TIPOS_LABEL[tipo] ?? tipo}
                        </p>
                        <p className="text-sm font-semibold text-neutral-900 tabular-nums">
                          ${monto.toLocaleString("es-AR")}
                        </p>
                      </div>
                    ))}
                    {Object.keys(porTipo).length === 0 && (
                      <p className="text-neutral-500 text-sm col-span-2">Sin días cargados</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    {evento.diasUtileros.slice(0, 5).map((d) => (
                      <div
                        key={d.id}
                        className="flex justify-between text-sm py-2 px-3 rounded-lg bg-neutral-50 hover:bg-neutral-100/80 transition-colors"
                      >
                        <span className="text-neutral-700">
                          {d.utilero.nombre} — {TIPOS_LABEL[d.tipo ?? "EVENTO"]}
                          {(d.tipo === "ARMADO" || d.tipo === "ARMADO_1" || d.tipo === "ARMADO_2" || d.tipo === "EVENTO") && ` (${d.dias} día${d.dias !== 1 ? "s" : ""})`}
                        </span>
                        <span className="font-semibold text-neutral-900 tabular-nums">
                          ${d.monto.toLocaleString("es-AR")}
                        </span>
                      </div>
                    ))}
                    {evento.diasUtileros.length > 5 && (
                      <p className="text-neutral-500 text-sm pt-2">+{evento.diasUtileros.length - 5} más</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <UtilerosCatalogo />
    </div>
  );
}
