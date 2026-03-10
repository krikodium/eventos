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
        <p className="text-slate-500">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {eventos.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <p className="text-slate-500 mb-4">No hay eventos</p>
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
              <div key={evento.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-700 bg-slate-800 flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-white">{evento.nombre}</h3>
                    <p className="text-slate-300 text-sm mt-0.5">
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
                      className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-600 rounded-lg transition-colors"
                    >
                      Cargar datos →
                    </Link>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                    {Object.entries(porTipo).map(([tipo, monto]) => (
                      <div key={tipo} className="rounded-lg bg-slate-50 p-3 border border-slate-100">
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                          {TIPOS_LABEL[tipo] ?? tipo}
                        </p>
                        <p className="text-sm font-semibold text-slate-900 tabular-nums">
                          ${monto.toLocaleString("es-AR")}
                        </p>
                      </div>
                    ))}
                    {Object.keys(porTipo).length === 0 && (
                      <p className="text-slate-500 text-sm col-span-2">Sin días cargados</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    {evento.diasUtileros.slice(0, 5).map((d) => (
                      <div
                        key={d.id}
                        className="flex justify-between text-sm py-2 px-3 rounded-lg bg-slate-50 hover:bg-slate-100/80 transition-colors"
                      >
                        <span className="text-slate-700">
                          {d.utilero.nombre} — {TIPOS_LABEL[d.tipo ?? "EVENTO"]} ({d.dias} día{d.dias !== 1 ? "s" : ""})
                        </span>
                        <span className="font-semibold text-slate-900 tabular-nums">
                          ${d.monto.toLocaleString("es-AR")}
                        </span>
                      </div>
                    ))}
                    {evento.diasUtileros.length > 5 && (
                      <p className="text-slate-500 text-sm pt-2">+{evento.diasUtileros.length - 5} más</p>
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
