"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { supabaseNavegador } from "@/lib/supabase/navegador";
import { cop, hora } from "@/lib/formato";
import type { Categoria, EstadoPedido } from "@/lib/tipos";
import { Mas, Menos } from "@/components/iconos";
import { avanzarPedido } from "../acciones";
import { atenderAviso, cerrarCuenta, confirmarMesa, pedidoManual } from "./acciones";
import { cargarDatosMeseros, type CuentaAbierta, type DatosMeseros, type PedidoMesa } from "./datos";

/** Dos tonos cortos cuando llega un aviso nuevo (sin archivos de audio). */
function pitido() {
  try {
    const ctx = new AudioContext();
    [0, 0.2].forEach((t, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = i ? 660 : 990;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.16);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.18);
    });
  } catch {}
}

const minutos = (iso: string, ahora: number) => Math.max(0, Math.floor((ahora - new Date(iso).getTime()) / 60_000));

const ESTADO: Partial<Record<EstadoPedido, string>> = {
  por_confirmar: "Por confirmar",
  recibido: "En cocina",
  preparando: "En cocina",
  va_mesa: "Listo para llevar",
  entregado: "Servido",
  cancelado: "Cancelado",
};

export function PanelMeseros({
  restauranteId,
  inicial,
  categorias,
}: {
  restauranteId: string;
  inicial: DatosMeseros;
  categorias: Categoria[];
}) {
  const [datos, setDatos] = useState(inicial);
  const [ahora, setAhora] = useState(() => Date.now());
  const [conectado, setConectado] = useState(true);
  const [mesaManual, setMesaManual] = useState<string | null>(null);
  const conocidos = useRef(new Set(inicial.avisos.map((a) => a.id)));

  const recargar = useCallback(async () => {
    const nuevos = await cargarDatosMeseros(supabaseNavegador(), restauranteId);
    if (nuevos.avisos.some((a) => !conocidos.current.has(a.id))) pitido();
    nuevos.avisos.forEach((a) => conocidos.current.add(a.id));
    setDatos(nuevos);
  }, [restauranteId]);

  useEffect(() => {
    const supabase = supabaseNavegador();
    const filtro = `restaurant_id=eq.${restauranteId}`;
    const canal = supabase
      .channel(`meseros:${restauranteId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "service_calls", filter: filtro }, () => recargar())
      .on("postgres_changes", { event: "*", schema: "public", table: "table_sessions", filter: filtro }, () => recargar())
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: filtro }, () => recargar())
      .subscribe((e) => setConectado(e === "SUBSCRIBED"));
    const reloj = setInterval(() => setAhora(Date.now()), 30_000);
    const respaldo = setInterval(recargar, 45_000);
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
    const n = datos.avisos.length + datos.porLlevar.length;
    document.title = n ? `(${n}) Meseros` : "Meseros";
  }, [datos.avisos.length, datos.porLlevar.length]);

  const conCuenta = new Set(datos.cuentas.map((c) => c.table_id));
  const sinCuenta = datos.mesas.filter((m) => !conCuenta.has(m.id));

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-16">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Meseros</h1>
        <p className="flex items-center gap-2 text-sm font-semibold text-ink-soft">
          <span className={`size-2.5 rounded-full ${conectado ? "bg-ok" : "bg-coral"}`} aria-hidden />
          {conectado ? "En vivo" : "Reconectando…"}
        </p>
      </div>

      {/* 1. Avisos de las mesas: lo más urgente, arriba */}
      {datos.avisos.length > 0 && (
        <section className="mt-6" aria-labelledby="t-avisos">
          <h2 id="t-avisos" className="sr-only">
            Avisos
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {datos.avisos.map((a) => (
              <Accion
                key={a.id}
                titulo={`Mesa ${a.table_sessions?.restaurant_tables?.label ?? "?"}`}
                detalle={`${a.kind === "cuenta" ? "Pide la cuenta" : "Llama al mesero"} · hace ${minutos(a.created_at, ahora)} min`}
                boton="Atendido"
                tono={a.kind === "cuenta" ? "cuenta" : "mesero"}
                hacer={() => atenderAviso(a.id)}
                alTerminar={recargar}
              />
            ))}
          </ul>
        </section>
      )}

      {/* 2. Pedidos listos en cocina para llevar a la mesa */}
      <section className="mt-8" aria-labelledby="t-llevar">
        <h2 id="t-llevar" className="font-display text-2xl font-extrabold tracking-tight">
          Llevar a la mesa <span className="tabular text-ink-soft">({datos.porLlevar.length})</span>
        </h2>
        {datos.porLlevar.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">Cuando la cocina termine un pedido de mesa, aparece aquí.</p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {datos.porLlevar.map((p) => (
              <Accion
                key={p.id}
                titulo={`Mesa ${p.table_label ?? "?"}`}
                detalle={`#${p.daily_number} ${p.customer_name}: ${p.order_items.map((i) => `${i.quantity}× ${i.product_name}`).join(", ")}`}
                boton="Servido"
                tono="llevar"
                hacer={() => avanzarPedido(p.id, "entregado")}
                alTerminar={recargar}
              />
            ))}
          </ul>
        )}
      </section>

      {/* 3. Cuentas abiertas */}
      <section className="mt-10" aria-labelledby="t-cuentas">
        <h2 id="t-cuentas" className="font-display text-2xl font-extrabold tracking-tight">
          Mesas abiertas <span className="tabular text-ink-soft">({datos.cuentas.length})</span>
        </h2>
        {datos.cuentas.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">No hay cuentas abiertas. Se abren cuando un cliente escanea el QR de su mesa.</p>
        ) : (
          <ul className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {datos.cuentas.map((c) => (
              <TarjetaCuenta key={c.id} cuenta={c} alPedir={() => setMesaManual(c.table_id)} alTerminar={recargar} />
            ))}
          </ul>
        )}
      </section>

      {/* 4. Pedido a mano */}
      <section className="mt-10" aria-labelledby="t-manual">
        <h2 id="t-manual" className="font-display text-2xl font-extrabold tracking-tight">
          Pedido a mano
        </h2>
        <p className="mt-1 text-sm text-ink-soft">Para clientes que prefieren no usar el celular.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {[...datos.cuentas.map((c) => ({ id: c.table_id, label: c.restaurant_tables?.label ?? "?" })), ...sinCuenta].map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMesaManual(m.id)}
              className={`min-h-11 rounded-full border-2 px-4 text-sm font-bold transition-colors ${
                mesaManual === m.id ? "border-outline bg-ink text-bg" : "border-line bg-surface"
              }`}
            >
              Mesa {m.label}
            </button>
          ))}
          {datos.mesas.length === 0 && <p className="text-sm text-ink-soft">Primero crea las mesas en la pestaña Mesas.</p>}
        </div>
        {mesaManual && (
          <PedidoManual
            key={mesaManual}
            mesa={datos.mesas.find((m) => m.id === mesaManual) ?? { id: mesaManual, label: "?" }}
            categorias={categorias}
            alTerminar={() => {
              setMesaManual(null);
              recargar();
            }}
          />
        )}
      </section>
    </main>
  );
}

/** Tarjeta de una acción rápida (aviso o pedido por llevar). */
function Accion({
  titulo,
  detalle,
  boton,
  tono,
  hacer,
  alTerminar,
}: {
  titulo: string;
  detalle: string;
  boton: string;
  tono: "mesero" | "cuenta" | "llevar";
  hacer: () => Promise<{ ok: boolean; mensaje?: string }>;
  alTerminar: () => void;
}) {
  const [enviando, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fondo = tono === "cuenta" ? "bg-coral-soft" : tono === "mesero" ? "bg-surface-2" : "bg-hoja-soft";
  return (
    <li className={`aparecer flex flex-col gap-3 rounded-2xl p-4 sticker ${fondo}`}>
      <div>
        <p className="font-display text-2xl leading-none font-extrabold">{titulo}</p>
        <p className="mt-1.5 text-sm font-semibold">{detalle}</p>
      </div>
      {error && <p className="text-sm font-semibold text-coral-ink">{error}</p>}
      <button
        type="button"
        className="btn min-h-11 w-full"
        disabled={enviando}
        onClick={() =>
          iniciar(async () => {
            const r = await hacer();
            if (!r.ok) setError(r.mensaje ?? "Error");
            alTerminar();
          })
        }
      >
        {enviando ? "Guardando…" : boton}
      </button>
    </li>
  );
}

function TarjetaCuenta({ cuenta: c, alPedir, alTerminar }: { cuenta: CuentaAbierta; alPedir: () => void; alTerminar: () => void }) {
  const [enviando, iniciar] = useTransition();
  const [cerrando, setCerrando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pedidos = [...c.orders].sort((a, b) => a.daily_number - b.daily_number);
  const total = pedidos.filter((p) => p.status !== "cancelado").reduce((n, p) => n + p.total, 0);
  const confirmada = Boolean(c.confirmed_at);

  const correr = (f: () => Promise<{ ok: boolean; mensaje?: string; total?: number }>) =>
    iniciar(async () => {
      setError(null);
      const r = await f();
      if (!r.ok) setError(r.mensaje ?? "Error");
      setCerrando(false);
      alTerminar();
    });

  return (
    <li className={`flex flex-col rounded-[1.5rem] bg-surface sticker ${confirmada ? "" : "ring-4 ring-brand/50"}`}>
      <div className="flex items-center justify-between gap-3 border-b-2 border-outline px-4 py-3">
        <p className="font-display text-2xl font-extrabold">Mesa {c.restaurant_tables?.label}</p>
        <span className="text-sm text-ink-soft">desde las {hora(c.opened_at)}</span>
      </div>

      {!confirmada && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-brand/25 px-4 py-3">
          <p className="text-sm font-bold">¿La mesa está ocupada?</p>
          <button type="button" className="btn min-h-10 px-4 text-sm" disabled={enviando} onClick={() => correr(() => confirmarMesa(c.id))}>
            Confirmar mesa
          </button>
        </div>
      )}

      <ul className="flex-1 divide-y-2 divide-line px-4">
        {pedidos.length === 0 && <li className="py-3 text-sm text-ink-soft">Aún no han pedido.</li>}
        {pedidos.map((p: PedidoMesa) => (
          <li key={p.id} className="py-2.5 text-sm">
            <div className="flex justify-between gap-2">
              <span className="font-bold">
                #{p.daily_number} {p.customer_name}
              </span>
              <span className={`text-xs font-bold uppercase ${p.status === "por_confirmar" ? "text-coral-ink" : "text-ink-soft"}`}>
                {ESTADO[p.status] ?? p.status}
              </span>
            </div>
            <p className="text-ink-soft">{p.order_items.map((i) => `${i.quantity}× ${i.product_name}`).join(", ")}</p>
          </li>
        ))}
      </ul>

      <div className="border-t-2 border-line px-4 py-3">
        <p className="tabular flex justify-between text-lg font-extrabold">
          <span>Total</span>
          <span>{cop(total)}</span>
        </p>
        {error && <p className="mt-2 text-sm font-semibold text-coral-ink">{error}</p>}
        {cerrando ? (
          <div className="mt-3 rounded-2xl bg-surface-2 p-3">
            <p className="text-sm font-bold">¿Cobraste {cop(total)}? Al cerrar, el QR de la mesa queda listo para los próximos clientes.</p>
            <div className="mt-3 flex gap-2">
              <button type="button" className="btn btn-ghost min-h-11 flex-1 text-sm" onClick={() => setCerrando(false)} disabled={enviando}>
                Volver
              </button>
              <button type="button" className="btn min-h-11 flex-1 text-sm" onClick={() => correr(() => cerrarCuenta(c.id))} disabled={enviando}>
                {enviando ? "Cerrando…" : "Sí, cerrar cuenta"}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex gap-2">
            <button type="button" className="btn btn-ghost min-h-11 flex-1 text-sm" onClick={alPedir}>
              Pedido a mano
            </button>
            <button type="button" className="btn min-h-11 flex-1 text-sm" onClick={() => setCerrando(true)}>
              Cerrar cuenta
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

/** El mesero arma un pedido con los platos del menú y lo manda a la cocina. */
function PedidoManual({
  mesa,
  categorias,
  alTerminar,
}: {
  mesa: { id: string; label: string };
  categorias: Categoria[];
  alTerminar: () => void;
}) {
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();
  const productos = categorias.flatMap((c) => c.products);
  const total = productos.reduce((n, p) => n + (cantidades[p.id] ?? 0) * p.price, 0);
  const cambiar = (id: string, d: number) =>
    setCantidades((c) => ({ ...c, [id]: Math.max(0, Math.min(20, (c[id] ?? 0) + d)) }));

  function enviar() {
    setError(null);
    iniciar(async () => {
      const items = Object.entries(cantidades)
        .filter(([, q]) => q > 0)
        .map(([product_id, quantity]) => ({ product_id, quantity }));
      const r = await pedidoManual({ mesa: mesa.id, nombre, items });
      if (!r.ok) {
        setError(r.mensaje);
        return;
      }
      alTerminar();
    });
  }

  return (
    <div className="aparecer mt-4 rounded-[1.5rem] bg-surface p-4 sticker">
      <p className="font-display text-xl font-extrabold">Pedido para la mesa {mesa.label}</p>
      <div className="mt-3 max-h-[50dvh] space-y-5 overflow-y-auto pr-1">
        {categorias.map((c) => (
          <div key={c.id}>
            <p className="text-xs font-bold tracking-wide text-ink-soft uppercase">{c.name}</p>
            <ul className="mt-1 divide-y-2 divide-line">
              {c.products.map((p) => {
                const q = cantidades[p.id] ?? 0;
                return (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <span className="block font-semibold">{p.name}</span>
                      <span className="tabular text-sm text-ink-soft">{cop(p.price)}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      <button type="button" className="btn-icon" onClick={() => cambiar(p.id, -1)} disabled={!q} aria-label={`Una ${p.name} menos`}>
                        <Menos />
                      </button>
                      <span className="tabular w-6 text-center font-bold">{q}</span>
                      <button type="button" className="btn-icon is-add" onClick={() => cambiar(p.id, 1)} aria-label={`Una ${p.name} más`}>
                        <Mas />
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <label htmlFor="pm-nombre" className="mt-4 mb-1.5 block text-[15px] font-bold">
        Nombre del cliente <span className="text-xs font-semibold text-ink-soft">Opcional</span>
      </label>
      <input id="pm-nombre" className="campo" maxLength={40} value={nombre} onChange={(e) => setNombre(e.target.value)} />
      {error && <p className="mt-2 text-sm font-semibold text-coral-ink">{error}</p>}
      <button type="button" className="btn mt-4 w-full" onClick={enviar} disabled={enviando || total === 0}>
        {enviando ? "Enviando…" : `Enviar a la cocina · ${cop(total)}`}
      </button>
    </div>
  );
}
