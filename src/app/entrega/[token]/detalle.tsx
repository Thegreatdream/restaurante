"use client";

import { useState, useTransition } from "react";
import { celular, cop } from "@/lib/formato";
import { enlaceMapa } from "@/lib/whatsapp";
import type { Entrega } from "@/lib/tipos";
import { Check } from "@/components/iconos";
import { marcarEntregado } from "../../repartidor/acciones";

export function DetalleEntrega({ token, entrega: e }: { token: string; entrega: Entrega }) {
  const [entregado, setEntregado] = useState(e.status === "entregado");
  const [confirmar, setConfirmar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();

  const pagado = e.payment_status === "pagado";
  const vueltas = e.payment_method === "efectivo" && e.cash_change_for ? e.cash_change_for - e.total : null;

  const entregar = () =>
    iniciar(async () => {
      setError(null);
      const r = await marcarEntregado(token);
      if (r.ok || r.mensaje?.includes("ya estaba")) setEntregado(true);
      else setError(r.mensaje ?? "Error");
      setConfirmar(false);
    });

  return (
    <main className="mx-auto min-h-dvh w-full max-w-xl px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-36">
      <p className="text-sm font-bold text-ink-soft">{e.restaurant_name}</p>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">
        Pedido <span className="tabular">#{e.number}</span>
      </h1>
      {e.courier_name && <p className="text-sm text-ink-soft">Lo lleva {e.courier_name}</p>}

      {/* Cobro: lo primero que el domiciliario debe tener claro */}
      <section
        className={`mt-5 rounded-[1.5rem] p-5 sticker ${pagado ? "bg-hoja-soft" : "bg-brand text-[#1e1a17]"}`}
        aria-label="Cobro"
      >
        {pagado ? (
          <p className="font-display text-2xl font-extrabold">Ya pagó. No cobres nada.</p>
        ) : (
          <>
            <p className="text-sm font-bold uppercase">Cobra</p>
            <p className="tabular font-display text-4xl leading-none font-extrabold">{cop(e.total)}</p>
            <p className="mt-2 font-semibold">
              {e.payment_method === "efectivo" ? "En efectivo" : "Por transferencia (Nequi o Bancolombia)"}
              {e.cash_change_for ? ` · paga con ${cop(e.cash_change_for)}` : ""}
            </p>
            {vueltas !== null && vueltas > 0 && <p className="tabular mt-1 font-bold">Lleva {cop(vueltas)} de vueltas.</p>}
          </>
        )}
      </section>

      <section className="mt-5 rounded-[1.5rem] border-2 border-line bg-surface p-5" aria-label="Cliente y dirección">
        <p className="text-xs font-bold tracking-wide text-ink-soft uppercase">Cliente</p>
        <p className="mt-0.5 text-lg font-bold">{e.customer_name}</p>
        <p className="mt-3 text-xs font-bold tracking-wide text-ink-soft uppercase">Dirección</p>
        <p className="mt-0.5 text-lg font-bold break-words">{e.address}</p>
        {e.address_notes && <p className="mt-1 break-words text-ink-soft">“{e.address_notes}”</p>}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {e.customer_phone && (
            <a href={`tel:+57${e.customer_phone}`} className="btn btn-ghost min-h-12 text-[15px]">
              Llamar · <span className="tabular">{celular(e.customer_phone)}</span>
            </a>
          )}
          {e.address && (
            <a href={enlaceMapa(e.address)} target="_blank" rel="noopener" className="btn btn-ghost min-h-12 text-[15px]">
              Abrir en Google Maps
            </a>
          )}
        </div>
      </section>

      <section className="mt-5 rounded-[1.5rem] border-2 border-line bg-surface p-5" aria-label="Productos">
        <p className="text-xs font-bold tracking-wide text-ink-soft uppercase">Lleva</p>
        <ul className="mt-2 space-y-1">
          {e.items.map((i, n) => (
            <li key={n} className="flex gap-2 text-[15px]">
              <span className="tabular min-w-7 font-extrabold">{i.quantity}×</span>
              {i.name}
            </li>
          ))}
        </ul>
        {e.restaurant_phone && (
          <a href={`tel:+57${e.restaurant_phone}`} className="mt-4 inline-block text-sm font-semibold underline underline-offset-4">
            Llamar al restaurante
          </a>
        )}
      </section>

      {/* Barra fija abajo: marcar como entregado (con confirmación) */}
      <div className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t-2 border-outline bg-bg/95 px-4 pt-3 backdrop-blur-sm">
        <div className="mx-auto max-w-xl pb-3">
          {error && <p className="mb-2 text-sm font-semibold text-coral-ink">{error}</p>}
          {entregado ? (
            <p className="flex min-h-14 items-center justify-center gap-2 rounded-full bg-hoja font-bold text-white">
              <Check /> Entregado. ¡Gracias!
            </p>
          ) : confirmar ? (
            <div className="flex gap-2">
              <button type="button" className="btn btn-ghost min-h-14 flex-1" onClick={() => setConfirmar(false)} disabled={enviando}>
                Todavía no
              </button>
              <button type="button" className="btn min-h-14 flex-1" onClick={entregar} disabled={enviando}>
                {enviando ? "Guardando…" : pagado ? "Sí, lo entregué" : "Sí, entregué y cobré"}
              </button>
            </div>
          ) : (
            <button type="button" className="btn min-h-14 w-full text-lg" onClick={() => setConfirmar(true)} disabled={e.status !== "en_camino"}>
              Marcar como entregado
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
