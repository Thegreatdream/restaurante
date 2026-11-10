"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { carrito, useCarrito, useHidratado } from "@/lib/carrito";
import { supabaseNavegador } from "@/lib/supabase/navegador";
import { cop } from "@/lib/formato";
import { textoApertura } from "@/lib/apertura";
import type { Ajustes, Categoria, CuentaMesa, EstadoPedido, SesionMesa } from "@/lib/tipos";
import { NavCategorias } from "@/components/menu/nav-categorias";
import { ListaMenu } from "@/components/menu/lista-menu";
import { ResumenCarrito } from "@/components/carrito/resumen-carrito";
import { CarritoMovil } from "@/components/carrito/carrito-movil";
import { crearPedidoMesa } from "../acciones";
import { Check } from "@/components/iconos";

const CLAVE_NOMBRE = "tato:nombre-mesa:v1";

const ESTADO: Record<EstadoPedido, { texto: string; clase: string }> = {
  por_confirmar: { texto: "Esperando al mesero", clase: "bg-surface-2 text-ink" },
  recibido: { texto: "Recibido", clase: "bg-surface-2 text-ink" },
  preparando: { texto: "Preparando", clase: "bg-brand text-[#1e1a17]" },
  va_mesa: { texto: "Va para tu mesa", clase: "bg-hoja text-white" },
  entregado: { texto: "Servido", clase: "bg-hoja-soft text-hoja-ink" },
  cancelado: { texto: "Cancelado", clase: "bg-coral-soft text-coral-ink" },
  listo_recoger: { texto: "Listo", clase: "bg-hoja text-white" },
  en_camino: { texto: "En camino", clase: "bg-hoja text-white" },
};

/** La cuenta de la mesa en vivo: se consulta cada pocos segundos y al volver a la pestaña. */
function useCuenta(sesion: SesionMesa) {
  const [cuenta, setCuenta] = useState<CuentaMesa | null>(null);
  const recargar = useCallback(async () => {
    const { data } = await supabaseNavegador().rpc("table_session_view", {
      p_session: sesion.session_id,
      p_code: sesion.access_code,
    });
    setCuenta((data as CuentaMesa) ?? null);
  }, [sesion.session_id, sesion.access_code]);

  useEffect(() => {
    // Primera carga de la cuenta desde la base de datos (sistema externo): es justo para lo que sirve un efecto
    // eslint-disable-next-line react-hooks/set-state-in-effect
    recargar();
    const t = setInterval(recargar, 8000);
    const alVolver = () => document.visibilityState === "visible" && recargar();
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [recargar]);
  return { cuenta, recargar };
}

export function MesaCliente({
  sesion,
  ajustes,
  categorias,
}: {
  sesion: SesionMesa;
  ajustes: Ajustes;
  categorias: Categoria[];
}) {
  const { cuenta, recargar } = useCuenta(sesion);
  const [cerrarHoja, setCerrarHoja] = useState(0);
  const cerrada = cuenta?.status === "cerrada";
  const confirmada = cuenta?.confirmed ?? sesion.confirmed;

  const alEnviar = () => {
    setCerrarHoja((n) => n + 1);
    recargar();
  };

  return (
    <>
      <section className="border-b-2 border-outline bg-band text-band-ink">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 md:py-8">
          <p className="font-display text-[2.6rem] leading-none font-extrabold tracking-tight uppercase md:text-6xl">
            Mesa {sesion.table_label}
            <span className="text-brand">.</span>
          </p>
          <p className="mt-2 max-w-[44ch] text-band-soft">
            {cerrada
              ? "Esta cuenta ya se cerró. Gracias por tu visita."
              : confirmada
                ? "Pide desde tu celular: lo que envíes llega directo a la cocina y se suma a la cuenta de la mesa."
                : "Puedes ir pidiendo. Un mesero confirmará tu mesa en un momento y tu pedido pasará a la cocina."}
          </p>
          {!cerrada && <BotonesMesa sesion={sesion} cuenta={cuenta} alAvisar={recargar} />}
        </div>
      </section>

      {cerrada ? (
        <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10 text-center">
          <p className="text-ink-soft">Para volver a pedir, escanea otra vez el QR de la mesa.</p>
          <button type="button" className="btn mt-4" onClick={() => window.location.reload()}>
            Abrir una cuenta nueva
          </button>
        </main>
      ) : (
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-32 md:grid md:grid-cols-[minmax(0,1fr)_360px] md:gap-10 md:pb-16">
          <div className="min-w-0">
            <MiCuenta cuenta={cuenta} className="mt-6 md:hidden" />
            <div id="menu">
              <NavCategorias categorias={categorias} />
              <ListaMenu categorias={categorias} />
            </div>
          </div>
          <aside className="hidden md:block" aria-label="Tu pedido">
            <div className="sticky top-6 mt-8 space-y-6">
              <div className="rounded-[1.75rem] bg-surface p-5 sticker">
                <h2 className="font-display text-2xl font-extrabold">Tu pedido</h2>
                <FormularioMesa sesion={sesion} ajustes={ajustes} alEnviar={alEnviar} />
              </div>
              <MiCuenta cuenta={cuenta} />
            </div>
          </aside>
        </main>
      )}

      {!cerrada && (
        <CarritoMovil
          ajustes={ajustes}
          costoEnvio={0}
          cerrarSenal={cerrarHoja}
          contenido={<FormularioMesa sesion={sesion} ajustes={ajustes} alEnviar={alEnviar} />}
        />
      )}
    </>
  );
}

/** Llamar al mesero y pedir la cuenta: avisos inmediatos en la vista de meseros. */
function BotonesMesa({ sesion, cuenta, alAvisar }: { sesion: SesionMesa; cuenta: CuentaMesa | null; alAvisar: () => void }) {
  const [enviando, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const pendiente = (k: "mesero" | "cuenta") => cuenta?.calls.includes(k) ?? false;

  const avisar = (kind: "mesero" | "cuenta") =>
    iniciar(async () => {
      setError(null);
      const { error } = await supabaseNavegador().rpc("call_waiter", {
        p_session: sesion.session_id,
        p_code: sesion.access_code,
        p_kind: kind,
      });
      if (error) setError(error.message.includes("CUENTA_CERRADA") ? "La cuenta ya se cerró." : "No se pudo avisar. Intenta de nuevo.");
      else {
        try {
          navigator.vibrate?.(10);
        } catch {}
      }
      alAvisar();
    });

  return (
    <div className="mt-5">
      <div className="flex flex-wrap gap-3">
        {(
          [
            ["mesero", "Llamar al mesero", "Ya viene el mesero"],
            ["cuenta", "Pedir la cuenta", "Ya te traen la cuenta"],
          ] as const
        ).map(([kind, texto, hecho]) => (
          <button
            key={kind}
            type="button"
            onClick={() => avisar(kind)}
            disabled={enviando || pendiente(kind)}
            className={`btn min-h-12 ${kind === "cuenta" ? "btn-ghost" : ""}`}
          >
            {pendiente(kind) ? (
              <>
                <Check className="size-4" /> {hecho}
              </>
            ) : (
              texto
            )}
          </button>
        ))}
      </div>
      {error && <p className="mt-2 text-sm font-semibold text-[#ff9d82]">{error}</p>}
    </div>
  );
}

/** Pedidos de la mesa (de todos los celulares) y el total de la cuenta. */
function MiCuenta({ cuenta, className = "" }: { cuenta: CuentaMesa | null; className?: string }) {
  if (!cuenta || cuenta.orders.length === 0) return null;
  return (
    <section className={`rounded-[1.75rem] border-2 border-line bg-surface p-5 ${className}`} aria-labelledby="t-cuenta">
      <h2 id="t-cuenta" className="font-display text-xl font-extrabold">
        Cuenta de la mesa
      </h2>
      <ul className="mt-3 divide-y-2 divide-line">
        {cuenta.orders.map((o) => (
          <li key={o.id} className="py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-bold">
                {o.name} <span className="tabular text-sm font-semibold text-ink-soft">#{o.number}</span>
              </p>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${ESTADO[o.status].clase}`}>{ESTADO[o.status].texto}</span>
            </div>
            <p className="mt-1 text-sm text-ink-soft">{(o.items ?? []).map((i) => `${i.quantity}× ${i.name}`).join(", ")}</p>
          </li>
        ))}
      </ul>
      <p className="tabular mt-2 flex justify-between border-t-2 border-outline pt-3 text-lg font-extrabold">
        <span>Total</span>
        <span>{cop(cuenta.total)}</span>
      </p>
      <p className="mt-1 text-xs text-ink-soft">Pagas al mesero cuando pidas la cuenta.</p>
    </section>
  );
}

/** Nombre + autorización + enviar a la cocina. */
function FormularioMesa({ sesion, ajustes, alEnviar }: { sesion: SesionMesa; ajustes: Ajustes; alEnviar: () => void }) {
  const { items, cantidad } = useCarrito();
  const hidratado = useHidratado();
  const [nombre, setNombre] = useState("");
  const [autorizo, setAutorizo] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [enviando, iniciar] = useTransition();

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNombre(localStorage.getItem(CLAVE_NOMBRE) ?? "");
    } catch {}
  }, []);

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setMensaje(null);
    iniciar(async () => {
      const r = await crearPedidoMesa({
        sesion: sesion.session_id,
        codigo: sesion.access_code,
        nombre,
        autorizo: autorizo as true,
        items: items.map((i) => ({ product_id: i.id, quantity: i.qty })),
      });
      if (!r.ok) {
        setMensaje({ tipo: "error", texto: r.mensaje });
        return;
      }
      try {
        localStorage.setItem(CLAVE_NOMBRE, nombre.trim());
      } catch {}
      carrito.vaciar();
      setAutorizo(false);
      setMensaje({ tipo: "ok", texto: "¡Listo! Tu pedido se sumó a la cuenta de la mesa." });
      alEnviar();
    });
  }

  if (hidratado && cantidad === 0) {
    return (
      <div className="py-2">
        {mensaje?.tipo === "ok" && <p className="mb-3 rounded-2xl bg-hoja-soft px-4 py-3 text-sm font-semibold text-hoja-ink">{mensaje.texto}</p>}
        <ResumenCarrito ajustes={ajustes} conBoton={false} costoEnvio={null} />
      </div>
    );
  }

  return (
    <form onSubmit={enviar} noValidate>
      <ResumenCarrito ajustes={ajustes} conBoton={false} costoEnvio={null} />
      <label htmlFor="m-nombre" className="mt-4 mb-1.5 block text-[15px] font-bold">
        Tu nombre
      </label>
      <input
        id="m-nombre"
        className="campo"
        autoComplete="given-name"
        autoCapitalize="words"
        maxLength={40}
        placeholder="Para saber de quién es cada plato"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        disabled={enviando}
      />
      <label className="mt-3 flex cursor-pointer gap-3 rounded-2xl border-2 border-line p-3 text-sm leading-snug">
        <input type="checkbox" checked={autorizo} onChange={(e) => setAutorizo(e.target.checked)} className="mt-0.5 size-5 shrink-0" />
        <span>
          Autorizo a {ajustes.legal_name || ajustes.name} a usar mi nombre para preparar este pedido, según la{" "}
          <a href="/privacidad" target="_blank" className="font-semibold underline underline-offset-2">
            política de privacidad
          </a>
          .
        </span>
      </label>
      {mensaje && (
        <p
          role="alert"
          className={`mt-3 rounded-2xl px-4 py-3 text-sm font-semibold ${
            mensaje.tipo === "ok" ? "bg-hoja-soft text-hoja-ink" : "bg-coral-soft text-coral-ink"
          }`}
        >
          {mensaje.texto}
        </p>
      )}
      {ajustes.estado.open ? (
        <button type="submit" className="btn mt-4 w-full" disabled={enviando}>
          {enviando ? "Enviando…" : "Enviar a la cocina"}
        </button>
      ) : (
        <p className="mt-4 rounded-2xl bg-coral-soft px-4 py-3 text-center text-sm font-semibold text-coral-ink">
          {textoApertura(ajustes).aviso}
        </p>
      )}
    </form>
  );
}
