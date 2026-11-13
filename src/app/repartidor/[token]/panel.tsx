"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { supabaseNavegador } from "@/lib/supabase/navegador";
import { cop, hora } from "@/lib/formato";
import type { VistaDomiciliario } from "@/lib/tipos";
import { Flecha } from "@/components/iconos";
import { tomarPedido } from "../acciones";

/** Pitido corto cuando aparece un domicilio nuevo para tomar. */
function pitido() {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.22);
  } catch {}
}

export function PanelDomiciliario({ token, inicial, restaurante }: { token: string; inicial: VistaDomiciliario; restaurante: string }) {
  const router = useRouter();
  const [vista, setVista] = useState(inicial);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [tomando, iniciar] = useTransition();
  const conocidos = useRef(new Set(inicial.offered.map((o) => o.id)));

  const recargar = useCallback(async () => {
    const { data } = await supabaseNavegador().rpc("courier_view", { p_token: token });
    if (!data) return;
    const v = data as VistaDomiciliario;
    if (v.offered.some((o) => !conocidos.current.has(o.id))) {
      pitido();
      try {
        navigator.vibrate?.([60, 40, 60]);
      } catch {}
    }
    v.offered.forEach((o) => conocidos.current.add(o.id));
    setVista(v);
  }, [token]);

  useEffect(() => {
    const t = setInterval(recargar, 10_000);
    const alVolver = () => document.visibilityState === "visible" && recargar();
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [recargar]);

  const tomar = (id: string) =>
    iniciar(async () => {
      setMensaje(null);
      const r = await tomarPedido(token, id);
      if (r.ok) router.push(`/entrega/${r.entrega}`);
      else {
        setMensaje(r.mensaje);
        recargar();
      }
    });

  return (
    <main className="mx-auto min-h-dvh w-full max-w-xl px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-16">
      <p className="text-sm font-bold text-ink-soft">{restaurante}</p>
      <h1 className="font-display text-3xl tracking-tight">Hola, {vista.name.split(" ")[0]}</h1>
      <p className="mt-1 text-sm text-ink-soft">Guarda este enlace: aquí te llegan los domicilios. Se actualiza solo.</p>

      {mensaje && <p className="mt-4 rounded-lg bg-coral-soft px-4 py-3 text-sm font-semibold text-coral-ink">{mensaje}</p>}

      <section className="mt-6" aria-labelledby="t-disp">
        <h2 id="t-disp" className="font-display text-xl">
          Para tomar <span className="tabular text-ink-soft">({vista.offered.length})</span>
        </h2>
        {vista.offered.length === 0 ? (
          <p className="mt-2 rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-ink-soft">
            No hay domicilios disponibles ahora. Cuando haya uno, suena un pitido.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {vista.offered.map((o) => (
              <li key={o.id} className="aparecer rounded-lg bg-surface p-4 sticker">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-lg">
                      Pedido <span className="tabular">#{o.number}</span>
                    </p>
                    <p className="mt-0.5 break-words text-sm">{o.address}</p>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      {o.items} {o.items === 1 ? "plato" : "platos"} · ofrecido a las {hora(o.offered_at)}
                    </p>
                  </div>
                  <span className="tabular shrink-0 font-display text-lg">{cop(o.total)}</span>
                </div>
                <button type="button" className="btn mt-3 w-full" disabled={tomando} onClick={() => tomar(o.id)}>
                  {tomando ? "Tomando…" : "Lo llevo yo"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8" aria-labelledby="t-mias">
        <h2 id="t-mias" className="font-display text-xl">
          Mis entregas <span className="tabular text-ink-soft">({vista.mine.length})</span>
        </h2>
        {vista.mine.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">No tienes entregas en curso.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {vista.mine.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/entrega/${o.delivery_token}`}
                  className="levanta flex items-center justify-between gap-3 rounded-lg border border-outline bg-surface-2 p-4"
                >
                  <span className="min-w-0">
                    <span className="block font-bold">
                      Pedido <span className="tabular">#{o.number}</span>
                    </span>
                    <span className="block truncate text-sm text-ink-soft">{o.address}</span>
                  </span>
                  <Flecha />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
