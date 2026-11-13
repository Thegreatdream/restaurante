"use client";

import { useState, useTransition } from "react";
import { fechaLarga, horaDe } from "@/lib/formato";
import type { EstadoReserva, ReservaPublica } from "@/lib/tipos";
import { cancelarReserva } from "../../reservar/acciones";

const ESTADO: Record<EstadoReserva, { titulo: string; clase: string }> = {
  pendiente: { titulo: "Recibimos tu reserva", clase: "bg-surface-2" },
  confirmada: { titulo: "Tu reserva está confirmada", clase: "bg-hoja-soft" },
  cancelada: { titulo: "Reserva cancelada", clase: "bg-coral-soft" },
  llego: { titulo: "¡Gracias por venir!", clase: "bg-hoja-soft" },
  no_llego: { titulo: "Reserva vencida", clase: "bg-surface-2" },
};

export function DetalleReserva({
  token,
  reserva,
  restaurante,
}: {
  token: string;
  reserva: ReservaPublica;
  restaurante: { nombre: string; direccion: string | null; mapa: string | null; timezone: string };
}) {
  const [estado, setEstado] = useState(reserva.status);
  const [confirmar, setConfirmar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();
  const e = ESTADO[estado];
  const puedeCancelar = reserva.can_cancel && estado !== "cancelada";

  const cancelar = () =>
    iniciar(async () => {
      const r = await cancelarReserva(token);
      if (r.ok) setEstado("cancelada");
      else setError(r.mensaje ?? "Error");
      setConfirmar(false);
    });

  return (
    <div>
      <section className={`rounded-lg p-6 sticker ${e.clase}`}>
        <p className="antetitulo text-ink-soft">{restaurante.nombre}</p>
        <h1 className="mt-2 font-display text-4xl leading-tight">{e.titulo}</h1>
        <p className="mt-4 text-xl font-semibold first-letter:uppercase">
          {fechaLarga(reserva.slot_start, restaurante.timezone)} · {horaDe(reserva.slot_start, restaurante.timezone)}
        </p>
        <p className="mt-1 text-ink-soft">
          {reserva.party_size} {reserva.party_size === 1 ? "persona" : "personas"} · a nombre de {reserva.name}
        </p>
        {reserva.note && <p className="mt-2 text-sm text-ink-soft">Nota: “{reserva.note}”</p>}
        {estado === "pendiente" && <p className="mt-3 text-sm font-semibold">El restaurante la confirmará pronto.</p>}
      </section>

      {restaurante.direccion && estado !== "cancelada" && (
        <section className="mt-5 rounded-lg border border-line bg-surface p-5">
          <p className="antetitulo text-[11px] text-ink-soft">Dónde</p>
          <p className="mt-0.5 font-semibold">{restaurante.direccion}</p>
          {restaurante.mapa && (
            <a href={restaurante.mapa} target="_blank" rel="noopener" className="btn btn-ghost mt-3 min-h-11 text-sm">
              Cómo llegar
            </a>
          )}
        </section>
      )}

      {error && <p className="mt-4 text-sm font-semibold text-coral-ink">{error}</p>}
      {puedeCancelar &&
        (confirmar ? (
          <div className="mt-6 rounded-lg bg-surface-2 p-4">
            <p className="font-bold">¿Seguro que quieres cancelar la reserva?</p>
            <div className="mt-3 flex gap-2">
              <button type="button" className="btn btn-ghost min-h-12 flex-1" onClick={() => setConfirmar(false)} disabled={enviando}>
                No, mantenerla
              </button>
              <button type="button" className="btn min-h-12 flex-1 bg-coral" onClick={cancelar} disabled={enviando}>
                {enviando ? "Cancelando…" : "Sí, cancelar"}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="mt-6 min-h-11 text-sm font-semibold text-ink-soft underline underline-offset-4" onClick={() => setConfirmar(true)}>
            Cancelar reserva
          </button>
        ))}
    </div>
  );
}
