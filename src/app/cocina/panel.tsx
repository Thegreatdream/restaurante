"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, useTransition } from "react";
import { supabaseNavegador } from "@/lib/supabase/navegador";
import { celular, cop, hora } from "@/lib/formato";
import type { Domiciliario, PedidoCocina, TipoPedido } from "@/lib/tipos";
import { enlaceWhatsapp } from "@/lib/whatsapp";
import { avanzarPedido, borrarPedidosPrueba, despacharCon } from "./acciones";
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

/** Domiciliarios y dirección pública, para despachar y armar los mensajes de WhatsApp. */
const Despacho = createContext<{ domiciliarios: Domiciliario[]; base: string; restaurante: string }>({
  domiciliarios: [],
  base: "",
  restaurante: "",
});

export function PanelCocina({
  restauranteId,
  inicial,
  retrasoMinutos,
  modoDemo = false,
  domiciliarios = [],
  base = "",
  restaurante = "",
}: {
  restauranteId: string;
  inicial: PedidosCocina;
  retrasoMinutos: number;
  modoDemo?: boolean;
  domiciliarios?: Domiciliario[];
  base?: string;
  restaurante?: string;
}) {
  const [datos, setDatos] = useState(inicial);
  const [ahora, setAhora] = useState(() => Date.now());
  const [conectado, setConectado] = useState(true);
  const conocidos = useRef(new Set(inicial.activos.map((p) => p.id)));

  const recargar = useCallback(async () => {
    const nuevos = await cargarPedidosCocina(supabaseNavegador(), restauranteId);
    const llegaron = nuevos.activos.some((p) => !conocidos.current.has(p.id));
    nuevos.activos.forEach((p) => conocidos.current.add(p.id));
    if (llegaron) pitido();
    setDatos(nuevos);
  }, [restauranteId]);

  useEffect(() => {
    const supabase = supabaseNavegador();
    const canal = supabase
      .channel(`cocina:${restauranteId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `restaurant_id=eq.${restauranteId}` }, () => recargar())
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
  }, [recargar, restauranteId]);

  useEffect(() => {
    document.title = datos.activos.length ? `(${datos.activos.length}) Cocina` : "Cocina";
  }, [datos.activos.length]);

  // Al avanzar un pedido, se mueve de lista al instante (la recarga en vivo confirma después)
  const mover = (id: string, siguiente: Siguiente) =>
    setDatos((d) => {
      const todos = [...d.activos, ...d.enCurso];
      const p = todos.find((x) => x.id === id);
      if (!p) return d;
      const ahoraIso = new Date().toISOString();
      const nuevo = { ...p, status: siguiente } as PedidoCocina;
      const sin = (l: PedidoCocina[]) => l.filter((x) => x.id !== id);
      return siguiente === "entregado"
        ? { activos: sin(d.activos), enCurso: sin(d.enCurso), entregados: [{ ...nuevo, delivered_at: ahoraIso }, ...d.entregados] }
        : { activos: sin(d.activos), enCurso: [...sin(d.enCurso), nuevo], entregados: d.entregados };
    });

  return (
    <Despacho.Provider value={{ domiciliarios, base, restaurante }}>
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-16">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          En cocina <span className="tabular text-ink-soft">({datos.activos.length})</span>
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
              alAvanzar={mover}
              alFallar={recargar}
            />
          ))}
        </ol>
      )}

      {datos.enCurso.length > 0 && (
        <section className="mt-10" aria-labelledby="t-encurso">
          <h2 id="t-encurso" className="font-display text-2xl font-extrabold tracking-tight">
            Por entregar <span className="tabular text-ink-soft">({datos.enCurso.length})</span>
          </h2>
          <ul className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {datos.enCurso.map((p) => (
              <FilaPorEntregar key={p.id} pedido={p} alAvanzar={mover} alFallar={recargar} />
            ))}
          </ul>
        </section>
      )}

      <details className="group mt-10" open={datos.entregados.length > 0 && datos.entregados.length < 6}>
        <summary className="flex cursor-pointer list-none items-center justify-between rounded-2xl border-2 border-line bg-surface px-4 py-3 font-display text-lg font-extrabold">
          <span>
            Entregados hoy <span className="tabular text-ink-soft">({datos.entregados.length})</span>
          </span>
          <Chevron className="text-ink-soft transition-transform duration-200 ease-[var(--ease-out)] group-open:rotate-180" />
        </summary>
        <ul className="mt-3 divide-y-2 divide-line rounded-2xl border-2 border-line bg-surface">
          {datos.entregados.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm">
              <span className="font-bold">
                <span className="tabular">#{p.daily_number}</span> · {p.customer_name}
                <span className="ml-2 text-xs font-semibold text-ink-soft">{ETIQUETA_TIPO[p.order_type]}</span>
              </span>
              <span className="tabular text-ink-soft">
                {cop(p.total)} · {p.delivered_at ? hora(p.delivered_at) : ""}
              </span>
            </li>
          ))}
          {datos.entregados.length === 0 && <li className="px-4 py-3 text-sm text-ink-soft">Aún no hay pedidos entregados hoy.</li>}
        </ul>
      </details>
    </main>
    </Despacho.Provider>
  );
}

type Siguiente = "en_camino" | "listo_recoger" | "va_mesa" | "entregado";
const ETIQUETA_TIPO: Record<TipoPedido, string> = { domicilio: "Domicilio", recoger: "Para recoger", mesa: "Mesa" };

/** Avanza un pedido y guarda el error si falla. */
function useAvanzar(id: string, alAvanzar: (id: string, s: Siguiente) => void, alFallar: () => void) {
  const [enviando, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const avanzar = (s: Siguiente) => {
    setError(null);
    iniciar(async () => {
      const r = await avanzarPedido(id, s);
      if (r.ok) alAvanzar(id, s);
      else {
        setError(r.mensaje ?? "Error");
        alFallar();
      }
    });
  };
  return { enviando, error, avanzar };
}

function TarjetaPedido({
  pedido: p,
  fila,
  ahora,
  retrasoMinutos,
  alAvanzar,
  alFallar,
}: {
  pedido: PedidoCocina;
  fila: number;
  ahora: number;
  retrasoMinutos: number;
  alAvanzar: (id: string, s: Siguiente) => void;
  alFallar: () => void;
}) {
  const { enviando, error, avanzar } = useAvanzar(p.id, alAvanzar, alFallar);
  const minutos = minutosDesde(p.created_at, ahora);
  const esNuevo = p.status === "recibido" && minutos < retrasoMinutos;
  const recoger = p.order_type === "recoger";
  const mesa = p.order_type === "mesa";
  const siguiente: Siguiente = mesa ? "va_mesa" : recoger ? "listo_recoger" : "en_camino";
  const { domiciliarios } = useContext(Despacho);

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
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${esNuevo ? "bg-brand text-[#1e1a17]" : "bg-surface-2 text-ink"}`}>
          {esNuevo ? "Nuevo" : "Preparando"}
        </span>
      </div>

      {/* Tipo de pedido bien visible: la cocina debe saber si sale en moto o lo recogen */}
      <p
        className={`flex items-center justify-between gap-2 px-4 py-2 font-extrabold uppercase ${
          mesa ? "bg-ink text-2xl text-bg" : recoger ? "bg-hoja-soft text-sm text-hoja-ink" : "bg-surface-2 text-sm text-ink"
        }`}
      >
        <span>{mesa ? `Mesa ${p.table_label ?? ""}` : ETIQUETA_TIPO[p.order_type]}</span>
        {recoger && p.pickup_at && <span className="tabular normal-case">Pasa a las {hora(p.pickup_at)}</span>}
      </p>

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
            {p.customer_name}
            {p.customer_phone && (
              <>
                {" · "}
                <a href={`tel:+57${p.customer_phone}`} className="tabular underline underline-offset-2">
                  {celular(p.customer_phone)}
                </a>
              </>
            )}
          </dd>
        </div>
        {!recoger && p.address && (
          <div>
            <dt className="sr-only">Dirección</dt>
            <dd className="break-words">{p.address}</dd>
            {p.address_notes && <dd className="mt-0.5 break-words text-ink-soft">“{p.address_notes}”</dd>}
          </div>
        )}
        <div className="flex items-baseline justify-between gap-3">
          <dt className="sr-only">Pago y total</dt>
          <dd>
            {mesa ? "Se cobra en la cuenta" : p.payment_method === "efectivo" ? "Efectivo" : "Transferencia"}
            {p.cash_change_for ? <span className="tabular text-ink-soft"> · paga con {cop(p.cash_change_for)}</span> : null}
          </dd>
          <dd className="tabular font-display text-xl font-extrabold">{cop(p.total)}</dd>
        </div>
      </dl>

      <div className="px-4 pb-4">
        {error && <p className="mb-2 text-sm font-semibold text-coral-ink">{error}</p>}
        {!mesa && !recoger && domiciliarios.length > 0 ? (
          <ElegirDomiciliario pedido={p} alAvanzar={alAvanzar} alFallar={alFallar} />
        ) : (
          <button type="button" onClick={() => avanzar(siguiente)} disabled={enviando} className="btn w-full">
            {enviando ? "Guardando…" : mesa ? "Listo, llevar a la mesa" : recoger ? "Marcar como listo" : "Marcar como despachado"}
          </button>
        )}
      </div>
    </li>
  );
}

/** Pedido que ya salió de la cocina: falta confirmar que el cliente lo recibió o lo recogió. */
function FilaPorEntregar({
  pedido: p,
  alAvanzar,
  alFallar,
}: {
  pedido: PedidoCocina;
  alAvanzar: (id: string, s: Siguiente) => void;
  alFallar: () => void;
}) {
  const { enviando, error, avanzar } = useAvanzar(p.id, alAvanzar, alFallar);
  const recoger = p.order_type === "recoger";
  const mesa = p.order_type === "mesa";
  const desde = recoger || mesa ? p.ready_at : p.dispatched_at;
  return (
    <li className="flex flex-col gap-3 rounded-2xl border-2 border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold">
            <span className="tabular">#{p.daily_number}</span> · {p.customer_name}
          </p>
          <p className="text-sm text-ink-soft">
            {mesa ? `Llevar a la mesa ${p.table_label ?? ""}` : recoger ? "Listo para recoger" : "En camino"}
            {desde ? ` desde las ${hora(desde)}` : ""}
          </p>
        </div>
        <span className="tabular shrink-0 font-display text-lg font-extrabold">{cop(p.total)}</span>
      </div>
      {!recoger && !mesa && <LinkDomiciliario pedido={p} />}
      {error && <p className="text-sm font-semibold text-coral-ink">{error}</p>}
      <button type="button" onClick={() => avanzar("entregado")} disabled={enviando} className="btn btn-ghost min-h-11 w-full text-sm">
        {enviando ? "Guardando…" : mesa ? "Servido en la mesa" : recoger ? "Ya lo recogió" : "Marcar como entregado"}
      </button>
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

/** Asignar el domicilio a un domiciliario u ofrecerlo a todos. */
function ElegirDomiciliario({
  pedido: p,
  alAvanzar,
  alFallar,
}: {
  pedido: PedidoCocina;
  alAvanzar: (id: string, s: Siguiente) => void;
  alFallar: () => void;
}) {
  const { domiciliarios, restaurante } = useContext(Despacho);
  const [quien, setQuien] = useState("");
  const [enviando, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const ofrecido = Boolean(p.offered_at);

  const despachar = () =>
    iniciar(async () => {
      setError(null);
      const r = await despacharCon(p.id, quien as string);
      if (!r.ok) {
        setError(r.mensaje ?? "Error");
        alFallar();
        return;
      }
      if (quien === "todos") alFallar(); // recarga: el pedido sigue aquí, marcado como ofrecido
      else alAvanzar(p.id, "en_camino");
      setQuien("");
    });

  const avisoGrupo = enlaceWhatsapp(
    `Hay un domicilio disponible en ${restaurante}: pedido #${p.daily_number}${p.address ? ` para ${p.address}` : ""}. Entra a tu enlace de domiciliario y toca "Lo llevo yo".`,
  );

  return (
    <div className="space-y-2">
      {ofrecido && (
        <div className="rounded-xl bg-hoja-soft px-3 py-2 text-sm font-semibold text-hoja-ink">
          Ofrecido a todos · esperando a que alguien lo tome.{" "}
          <a href={avisoGrupo} target="_blank" rel="noopener" className="underline underline-offset-2">
            Avisar por WhatsApp
          </a>
        </div>
      )}
      {error && <p className="text-sm font-semibold text-coral-ink">{error}</p>}
      <div className="flex gap-2">
        <label htmlFor={`d-${p.id}`} className="sr-only">
          Domiciliario
        </label>
        <select id={`d-${p.id}`} className="campo min-h-12 min-w-0 flex-1 py-2" value={quien} onChange={(e) => setQuien(e.target.value)}>
          <option value="">{ofrecido ? "Asignar a alguien…" : "¿Quién lo lleva?"}</option>
          {domiciliarios.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
          {!ofrecido && <option value="todos">Ofrecer a todos</option>}
        </select>
        <button type="button" className="btn min-h-12 shrink-0 px-4" disabled={!quien || enviando} onClick={despachar}>
          {enviando ? "…" : quien === "todos" ? "Ofrecer" : "Despachar"}
        </button>
      </div>
    </div>
  );
}

/** En camino con domiciliario: quién lo lleva y botón para mandarle el link por WhatsApp. */
function LinkDomiciliario({ pedido: p }: { pedido: PedidoCocina }) {
  const { domiciliarios, base, restaurante } = useContext(Despacho);
  const d = domiciliarios.find((x) => x.id === p.courier_id);
  if (!d || !p.delivery_token) return null;
  const url = `${base}/entrega/${p.delivery_token}`;
  const texto = `Hola ${d.name.split(" ")[0]}, tienes un domicilio de ${restaurante}: pedido #${p.daily_number} para ${p.customer_name}${p.address ? `, ${p.address}` : ""}. Todo el detalle aquí: ${url}`;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2 text-sm">
      <span className="font-semibold">Lo lleva {d.name}</span>
      <a href={enlaceWhatsapp(texto, d.phone)} target="_blank" rel="noopener" className="font-bold underline underline-offset-2">
        Enviar por WhatsApp
      </a>
    </div>
  );
}
