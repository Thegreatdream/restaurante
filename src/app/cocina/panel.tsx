"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { supabaseNavegador } from "@/lib/supabase/navegador";
import { celular, cop, hora } from "@/lib/formato";
import type { PedidoCocina } from "@/lib/tipos";
import { borrarPedidosPrueba, despacharPedido } from "./acciones";
import { Chevron } from "@/components/iconos";
import { cargarPedidosCocina, type PedidosCocina } from "./datos";

/** Pitido corto cuando entra un pedido nuevo (sin archivos de audio). */
function pitido() {
  try {
    const ctx = new AudioContext();
    [0, 0.18].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.15);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.16);
    });
  } catch {}
}

function minutosDesde(iso: string, ahora: number) {
  return Math.max(0, Math.floor((ahora - new Date(iso).getTime()) / 60_000));
}

export function PanelCocina({
  inicial,
  retrasoMinutos,
  modoDemo = false,
}: {
  inicial: PedidosCocina;
  retrasoMinutos: number;
  modoDemo?: boolean;
}) {
  const [datos, setDatos] = useState(inicial);
  const [ahora, setAhora] = useState(() => Date.now());
  const [conectado, setConectado] = useState(true);
  const conocidos = useRef(new Set(inicial.activos.map((p) => p.id)));

  const recargar = useCallback(async () => {
    const nuevos = await cargarPedidosCocina(supabaseNavegador());
    const llegaron = nuevos.activos.some((p) => !conocidos.current.has(p.id));
    nuevos.activos.forEach((p) => conocidos.current.add(p.id));
    if (llegaron) pitido();
    setDatos(nuevos);
  }, []);

  useEffect(() => {
    const supabase = supabaseNavegador();
    const canal = supabase
      .channel("cocina")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => recargar())
      .subscribe((estado) => setConectado(estado === "SUBSCRIBED"));
    const reloj = setInterval(() => setAhora(Date.now()), 30_000);
    const respaldo = setInterval(recargar, 60_000);
    const alVolver = () => document.visibilityState === "visible" && recargar();
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      supabase.removeChannel(canal);
      clearInterval(reloj);
      clearInterval(respaldo);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [recargar]);

  useEffect(() => {
    document.title = datos.activos.length ? `(${datos.activos.length}) Cocina` : "Cocina";
  }, [datos.activos.length]);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-16">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          Pedidos <span className="tabular text-ink-soft">({datos.activos.length})</span>
        </h1>
        <p className="flex items-center gap-2 text-sm font-semibold text-ink-soft">
          <span className={`size-2.5 rounded-full ${conectado ? "bg-ok" : "bg-coral"}`} aria-hidden />
          {conectado ? "En vivo" : "Reconectando…"}
        </p>
      </div>

      {modoDemo && <BorrarPruebas alTerminar={recargar} />}

      {datos.activos.length === 0 ? (
        <p className="mt-6 rounded-2xl border-2 border-dashed border-line px-4 py-12 text-center text-ink-soft">
          No hay pedidos pendientes. Los nuevos aparecen aquí solos, con un pitido.
        </p>
      ) : (
        <ol className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {datos.activos.map((p, i) => (
            <TarjetaPedido
              key={p.id}
              pedido={p}
              fila={i + 1}
              ahora={ahora}
              retrasoMinutos={retrasoMinutos}
              alDespachar={(id) =>
                setDatos((d) => {
                  const pedido = d.activos.find((x) => x.id === id);
                  return pedido
                    ? {
                        activos: d.activos.filter((x) => x.id !== id),
                        despachados: [{ ...pedido, status: "en_camino", dispatched_at: new Date().toISOString() }, ...d.despachados],
                      }
                    : d;
                })
              }
              alFallar={recargar}
            />
          ))}
        </ol>
      )}

      <details className="group mt-10" open={datos.despachados.length > 0 && datos.despachados.length < 6}>
        <summary className="flex cursor-pointer list-none items-center justify-between rounded-2xl border-2 border-line bg-surface px-4 py-3 font-display text-lg font-extrabold">
          <span>
            Despachados hoy <span className="tabular text-ink-soft">({datos.despachados.length})</span>
          </span>
          <Chevron className="text-ink-soft transition-transform duration-200 ease-[var(--ease-out)] group-open:rotate-180" />
        </summary>
        <ul className="mt-3 divide-y-2 divide-line rounded-2xl border-2 border-line bg-surface">
          {datos.despachados.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm">
              <span className="font-bold">
                <span className="tabular">#{p.daily_number}</span> · {p.customer_name}
              </span>
              <span className="tabular text-ink-soft">
                {cop(p.total)} · salió {p.dispatched_at ? hora(p.dispatched_at) : ""}
              </span>
            </li>
          ))}
          {datos.despachados.length === 0 && <li className="px-4 py-3 text-sm text-ink-soft">Aún no has despachado pedidos hoy.</li>}
        </ul>
      </details>
    </main>
  );
}

function TarjetaPedido({
  pedido: p,
  fila,
  ahora,
  retrasoMinutos,
  alDespachar,
  alFallar,
}: {
  pedido: PedidoCocina;
  fila: number;
  ahora: number;
  retrasoMinutos: number;
  alDespachar: (id: string) => void;
  alFallar: () => void;
}) {
  const [enviando, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const minutos = minutosDesde(p.created_at, ahora);
  const esNuevo = p.status === "recibido" && minutos < retrasoMinutos;

  function despachar() {
    setError(null);
    iniciar(async () => {
      const r = await despacharPedido(p.id);
      if (r.ok) alDespachar(p.id);
      else {
        setError(r.mensaje ?? "Error");
        alFallar();
      }
    });
  }

  return (
    <li className={`aparecer flex flex-col rounded-[1.5rem] bg-surface sticker ${esNuevo ? "ring-4 ring-brand/50" : ""}`}>
      <div className="flex items-center gap-3 border-b-2 border-outline px-4 py-3">
        <span className="tabular grid size-10 shrink-0 place-items-center rounded-full bg-ink font-display text-lg font-extrabold text-bg" title="Posición en la fila">
          {fila}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg leading-tight font-extrabold">
            Pedido <span className="tabular">#{p.daily_number}</span>
          </p>
          <p className="tabular text-sm text-ink-soft">
            {hora(p.created_at)} · hace {minutos} min
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${
            esNuevo ? "bg-brand text-[#1e1a17]" : "bg-surface-2 text-ink"
          }`}
        >
          {esNuevo ? "Nuevo" : "Preparando"}
        </span>
      </div>

      <ul className="space-y-1 px-4 py-3 text-[15px]">
        {p.order_items.map((i) => (
          <li key={i.id} className="flex gap-2">
            <span className="tabular min-w-7 font-extrabold">{i.quantity}×</span>
            <span className="min-w-0 break-words">{i.product_name}</span>
          </li>
        ))}
      </ul>

      <dl className="mt-auto space-y-2 border-t-2 border-line px-4 py-3 text-sm">
        <div>
          <dt className="sr-only">Cliente</dt>
          <dd className="font-bold break-words">
            {p.customer_name} ·{" "}
            <a href={`tel:+57${p.customer_phone}`} className="tabular underline underline-offset-2">
              {celular(p.customer_phone)}
            </a>
          </dd>
        </div>
        <div>
          <dt className="sr-only">Dirección</dt>
          <dd className="break-words">{p.address}</dd>
          {p.address_notes && <dd className="mt-0.5 break-words text-ink-soft">“{p.address_notes}”</dd>}
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="sr-only">Pago y total</dt>
          <dd>
            {p.payment_method === "efectivo" ? "Efectivo" : "Transferencia"}
            {p.cash_change_for ? <span className="tabular text-ink-soft"> · paga con {cop(p.cash_change_for)}</span> : null}
          </dd>
          <dd className="tabular font-display text-xl font-extrabold">{cop(p.total)}</dd>
        </div>
      </dl>

      <div className="px-4 pb-4">
        {error && <p className="mb-2 text-sm font-semibold text-coral-ink">{error}</p>}
        <button type="button" onClick={despachar} disabled={enviando} className="btn w-full">
          {enviando ? "Despachando…" : "Marcar como despachado"}
        </button>
      </div>
    </li>
  );
}

/** Modo demostración: borra los pedidos de prueba en dos pasos (pedir y confirmar). */
function BorrarPruebas({ alTerminar }: { alTerminar: () => void }) {
  const [paso, setPaso] = useState<"inicio" | "confirmar" | "listo">("inicio");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [borrando, iniciar] = useTransition();

  function borrar() {
    iniciar(async () => {
      const r = await borrarPedidosPrueba();
      if (!r.ok) {
        setMensaje(r.mensaje ?? "Error");
        setPaso("inicio");
        return;
      }
      setMensaje(r.borrados === 1 ? "Se borró 1 pedido de prueba." : `Se borraron ${r.borrados} pedidos de prueba.`);
      setPaso("listo");
      alTerminar();
    });
  }

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-brand bg-surface px-4 py-3">
      <p className="text-sm">
        <span className="font-bold">Modo demostración.</span>{" "}
        <span className="text-ink-soft">{mensaje ?? "Los pedidos que entren son de prueba."}</span>
      </p>
      {paso === "confirmar" ? (
        <div className="flex gap-2">
          <button type="button" onClick={() => setPaso("inicio")} className="btn btn-ghost min-h-11 px-4 text-sm" disabled={borrando}>
            Cancelar
          </button>
          <button type="button" onClick={borrar} className="btn min-h-11 bg-coral px-4 text-sm" disabled={borrando}>
            {borrando ? "Borrando…" : "Sí, borrar todos"}
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setPaso("confirmar")} className="btn btn-ghost min-h-11 px-4 text-sm">
          Borrar pedidos de prueba
        </button>
      )}
    </div>
  );
}
