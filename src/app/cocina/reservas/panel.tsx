"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { supabaseNavegador } from "@/lib/supabase/navegador";
import { celular, fechaLarga, horaDe } from "@/lib/formato";
import type { EstadoReserva, Reserva } from "@/lib/tipos";
import { Atras, Flecha } from "@/components/iconos";
import { cambiarEstadoReserva } from "./acciones";

const ESTADO: Record<EstadoReserva, { texto: string; clase: string }> = {
  pendiente: { texto: "Pendiente", clase: "bg-brand text-[#1e1a17]" },
  confirmada: { texto: "Confirmada", clase: "bg-hoja-soft text-hoja-ink" },
  cancelada: { texto: "Cancelada", clase: "bg-coral-soft text-coral-ink" },
  llego: { texto: "Llegó", clase: "bg-hoja text-white" },
  no_llego: { texto: "No llegó", clase: "bg-surface-2 text-ink-soft" },
};
const ACTIVAS: EstadoReserva[] = ["pendiente", "confirmada", "llego"];
const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

/** "2026-11-15" de un instante, en la zona del restaurante. */
const diaDe = (iso: string, tz: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date(iso));

export function PanelReservas({
  restauranteId,
  timezone,
  hoy,
  capacidad,
}: {
  restauranteId: string;
  timezone: string;
  hoy: string;
  capacidad: number;
}) {
  const [mes, setMes] = useState(hoy.slice(0, 7)); // "2026-11"
  const [dia, setDia] = useState(hoy);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    const [a, m] = mes.split("-").map(Number);
    // Rango amplio (un día antes y después) para no perder reservas por la zona horaria
    const desde = new Date(Date.UTC(a, m - 1, 0)).toISOString();
    const hasta = new Date(Date.UTC(a, m, 2)).toISOString();
    const { data } = await supabaseNavegador()
      .from("reservations")
      .select("id, slot_start, party_size, name, phone, email, note, status, created_at")
      .eq("restaurant_id", restauranteId)
      .gte("slot_start", desde)
      .lt("slot_start", hasta)
      .order("slot_start");
    setReservas((data as Reserva[]) ?? []);
    setCargando(false);
  }, [mes, restauranteId]);

  useEffect(() => {
    // Carga desde la base de datos (sistema externo) al cambiar de mes
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
    const supabase = supabaseNavegador();
    const canal = supabase
      .channel(`reservas:${restauranteId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "reservations", filter: `restaurant_id=eq.${restauranteId}` }, () => cargar())
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [cargar, restauranteId]);

  // Personas y reservas activas por día (para el calendario)
  const porDia = useMemo(() => {
    const m = new Map<string, { reservas: number; personas: number }>();
    for (const r of reservas) {
      if (!ACTIVAS.includes(r.status)) continue;
      const k = diaDe(r.slot_start, timezone);
      const v = m.get(k) ?? { reservas: 0, personas: 0 };
      m.set(k, { reservas: v.reservas + 1, personas: v.personas + r.party_size });
    }
    return m;
  }, [reservas, timezone]);

  const delDia = reservas.filter((r) => diaDe(r.slot_start, timezone) === dia);
  const resumen = porDia.get(dia);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-16">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-labelledby="t-dia">
          <h1 id="t-dia" className="font-display text-3xl font-extrabold tracking-tight first-letter:uppercase">
            {dia === hoy ? "Reservas de hoy" : fechaLarga(`${dia}T17:00:00Z`, timezone)}
          </h1>
          <p className="mt-1 text-ink-soft">
            {resumen ? `${resumen.reservas} ${resumen.reservas === 1 ? "reserva" : "reservas"} · ${resumen.personas} personas` : "Sin reservas activas."}
            {dia !== hoy && (
              <button type="button" className="ml-3 font-semibold underline underline-offset-4" onClick={() => { setDia(hoy); setMes(hoy.slice(0, 7)); }}>
                Ir a hoy
              </button>
            )}
          </p>
          {cargando ? (
            <div className="mt-5 space-y-3" aria-hidden>
              {[0, 1].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-2xl bg-line" />
              ))}
            </div>
          ) : delDia.length === 0 ? (
            <p className="mt-5 rounded-2xl border-2 border-dashed border-line px-4 py-10 text-center text-ink-soft">No hay reservas este día.</p>
          ) : (
            <ul className="mt-5 space-y-3">
              {delDia.map((r) => (
                <TarjetaReserva key={r.id} r={r} timezone={timezone} alCambiar={cargar} />
              ))}
            </ul>
          )}
        </section>

        <aside aria-label="Calendario">
          <Calendario
            mes={mes}
            setMes={setMes}
            dia={dia}
            setDia={setDia}
            hoy={hoy}
            porDia={porDia}
            capacidad={capacidad}
          />
        </aside>
      </div>
    </main>
  );
}

function TarjetaReserva({ r, timezone, alCambiar }: { r: Reserva; timezone: string; alCambiar: () => void }) {
  const [enviando, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const cambiar = (e: EstadoReserva) =>
    iniciar(async () => {
      setError(null);
      const res = await cambiarEstadoReserva(r.id, e);
      if (!res.ok) setError(res.mensaje ?? "Error");
      alCambiar();
    });
  const acciones: [EstadoReserva, string][] =
    r.status === "pendiente"
      ? [["confirmada", "Confirmar"], ["cancelada", "Cancelar"]]
      : r.status === "confirmada"
        ? [["llego", "Llegó"], ["no_llego", "No llegó"], ["cancelada", "Cancelar"]]
        : [["confirmada", "Volver a confirmada"]];

  return (
    <li className={`rounded-[1.5rem] border-2 bg-surface p-4 ${r.status === "cancelada" || r.status === "no_llego" ? "border-line opacity-70" : "border-outline"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <span className="tabular font-display text-2xl font-extrabold">{horaDe(r.slot_start, timezone)}</span>
          <span>
            <span className="block font-bold">{r.name}</span>
            <span className="block text-sm text-ink-soft">
              {r.party_size} {r.party_size === 1 ? "persona" : "personas"} ·{" "}
              <a href={`tel:+57${r.phone}`} className="tabular underline underline-offset-2">
                {celular(r.phone)}
              </a>
            </span>
          </span>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${ESTADO[r.status].clase}`}>{ESTADO[r.status].texto}</span>
      </div>
      {r.note && <p className="mt-2 rounded-xl bg-surface-2 px-3 py-2 text-sm">“{r.note}”</p>}
      {error && <p className="mt-2 text-sm font-semibold text-coral-ink">{error}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {acciones.map(([e, texto], i) => (
          <button
            key={e}
            type="button"
            disabled={enviando}
            onClick={() => cambiar(e)}
            className={`btn min-h-11 px-4 text-sm ${i === 0 && e !== "cancelada" ? "" : "btn-ghost"}`}
          >
            {texto}
          </button>
        ))}
      </div>
    </li>
  );
}

function Calendario({
  mes,
  setMes,
  dia,
  setDia,
  hoy,
  porDia,
  capacidad,
}: {
  mes: string;
  setMes: (m: string) => void;
  dia: string;
  setDia: (d: string) => void;
  hoy: string;
  porDia: Map<string, { reservas: number; personas: number }>;
  capacidad: number;
}) {
  const [a, m] = mes.split("-").map(Number);
  const primero = new Date(Date.UTC(a, m - 1, 1, 12));
  const diasMes = new Date(Date.UTC(a, m, 0, 12)).getUTCDate();
  const vacios = (primero.getUTCDay() + 6) % 7; // lunes primero
  const mover = (d: number) => {
    const f = new Date(Date.UTC(a, m - 1 + d, 1, 12));
    setMes(`${f.getUTCFullYear()}-${String(f.getUTCMonth() + 1).padStart(2, "0")}`);
  };

  return (
    <div className="rounded-[1.5rem] bg-surface p-4 sticker lg:sticky lg:top-6">
      <div className="flex items-center justify-between">
        <button type="button" className="btn-icon" onClick={() => mover(-1)} aria-label="Mes anterior">
          <Atras />
        </button>
        <p className="font-display text-lg font-extrabold">
          {MESES[m - 1]} {a}
        </p>
        <button type="button" className="btn-icon" onClick={() => mover(1)} aria-label="Mes siguiente">
          <Flecha />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs font-bold text-ink-soft">
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {Array.from({ length: vacios }, (_, i) => (
          <span key={`v${i}`} />
        ))}
        {Array.from({ length: diasMes }, (_, i) => {
          const k = `${mes}-${String(i + 1).padStart(2, "0")}`;
          const info = porDia.get(k);
          const activo = k === dia;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setDia(k)}
              aria-pressed={activo}
              aria-label={`${i + 1}${info ? `, ${info.reservas} reservas` : ""}`}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm font-semibold transition-colors ${
                activo ? "bg-ink text-bg" : k === hoy ? "border-2 border-outline" : "hover:bg-surface-2"
              }`}
            >
              <span className="tabular">{i + 1}</span>
              {info && (
                <span
                  className={`tabular mt-0.5 rounded-full px-1.5 text-[10px] leading-4 font-bold ${
                    activo ? "bg-brand text-[#1e1a17]" : info.personas >= capacidad ? "bg-coral text-[#1e1a17]" : "bg-hoja-soft text-hoja-ink"
                  }`}
                >
                  {info.reservas}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-ink-soft">El número es la cantidad de reservas activas de cada día.</p>
    </div>
  );
}
