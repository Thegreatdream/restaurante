"use client";

import { useCallback, useEffect, useState } from "react";
import { Tato, type PoseTato } from "@/components/tato";
import { CaminoPedido } from "./camino-pedido";
import { supabaseNavegador } from "@/lib/supabase/navegador";
import { cop, hora, horaDe } from "@/lib/formato";
import type { EstadoPedido, PedidoPublico, TipoPedido } from "@/lib/tipos";

/** Los pasos que ve el cliente según cómo pidió. */
const PASOS: Record<TipoPedido, { estado: EstadoPedido; corto: string }[]> = {
  domicilio: [
    { estado: "recibido", corto: "Recibido" },
    { estado: "preparando", corto: "Preparando" },
    { estado: "en_camino", corto: "En camino" },
    { estado: "entregado", corto: "Entregado" },
  ],
  recoger: [
    { estado: "recibido", corto: "Recibido" },
    { estado: "preparando", corto: "Preparando" },
    { estado: "listo_recoger", corto: "Listo" },
    { estado: "entregado", corto: "Recogido" },
  ],
  mesa: [
    { estado: "recibido", corto: "Recibido" },
    { estado: "preparando", corto: "Preparando" },
    { estado: "va_mesa", corto: "Va a tu mesa" },
    { estado: "entregado", corto: "En tu mesa" },
  ],
};

type Copia = { pose: PoseTato; titulo: string; texto: string };

function copiaDe(estado: EstadoPedido, p: PedidoPublico, r: Restaurante, conTato: boolean): Copia {
  const quien = conTato ? "Tato" : "Ya";
  switch (estado) {
    case "recibido":
      return {
        pose: "libreta",
        titulo: "Anotando tu pedido",
        texto: conTato ? "Tato ya lo tiene en su libreta. En un momento pasa a la cocina." : "Ya lo recibimos. En un momento pasa a la cocina.",
      };
    case "preparando":
      return {
        pose: "cocinando",
        titulo: "Tu pedido se está preparando",
        texto:
          p.type === "recoger"
            ? `Te avisamos por correo cuando esté listo${p.pickup_at ? `. Lo tendremos para las ${horaDe(p.pickup_at, r.timezone)}` : ""}.`
            : p.type === "mesa"
              ? "En un momento lo llevamos a tu mesa."
              : "Lo llevaremos lo más pronto posible. Te avisaremos cuando salga.",
      };
    case "en_camino":
      return { pose: "moto", titulo: "Tu pedido va en camino", texto: "Te enviamos un correo. Ten listo el pago para recibirlo." };
    case "listo_recoger":
      return {
        pose: "recoger",
        titulo: "¡Tu pedido está listo!",
        texto: r.direccion ? `Pasa por él a ${r.direccion}. Te esperamos.` : `Pasa por él a ${r.nombre}. Te esperamos.`,
      };
    case "va_mesa":
      return { pose: "mesa", titulo: "Va para tu mesa", texto: "En un momento lo tienes servido." };
    case "entregado":
      return {
        pose: "celebrando",
        titulo: "¡Que lo disfrutes!",
        texto: `Gracias por pedir en ${r.nombre}.${conTato ? ` ${quien} te espera la próxima vez.` : ""}`,
      };
    case "cancelado":
      return { pose: "libreta", titulo: "Tu pedido fue cancelado", texto: "Si crees que es un error, escríbenos." };
  }
}

/**
 * El estado que ve el cliente. "recibido" pasa solo a "preparando" después de unos minutos:
 * la base de datos lo hace, pero aquí lo adelantamos con un reloj para que cambie justo a tiempo.
 */
function estadoVisible(p: PedidoPublico, ahora: number): EstadoPedido {
  if (p.status !== "recibido") return p.status;
  const limite = new Date(p.created_at).getTime() + p.prep_delay_minutes * 60_000;
  return ahora >= limite ? "preparando" : "recibido";
}

type Restaurante = { nombre: string; direccion: string | null; mapa: string | null; timezone: string };

export function SeguimientoPedido({
  inicial,
  mascota = "tato",
  restaurante,
}: {
  inicial: PedidoPublico;
  mascota?: string;
  restaurante: Restaurante;
}) {
  const [pedido, setPedido] = useState(inicial);
  const [ahora, setAhora] = useState(() => Date.now());
  const terminado = pedido.status === "entregado" || pedido.status === "cancelado";

  const recargar = useCallback(async () => {
    const { data } = await supabaseNavegador().rpc("get_order", { p_id: inicial.id });
    if (data) setPedido(data as PedidoPublico);
  }, [inicial.id]);

  // Tiempo real: la base de datos avisa en el canal "pedido:<id>" cada vez que cambia el estado.
  useEffect(() => {
    const supabase = supabaseNavegador();
    const canal = supabase
      .channel(`pedido:${inicial.id}`)
      .on("broadcast", { event: "estado" }, ({ payload }) => {
        setPedido((p) => ({ ...p, ...(payload as Partial<PedidoPublico>) }));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [inicial.id]);

  // Respaldo: si el celular estuvo en segundo plano o perdió señal, revisa al volver y cada 30 s.
  useEffect(() => {
    if (terminado) return;
    const alVolver = () => document.visibilityState === "visible" && recargar();
    document.addEventListener("visibilitychange", alVolver);
    const intervalo = setInterval(recargar, 30_000);
    return () => {
      document.removeEventListener("visibilitychange", alVolver);
      clearInterval(intervalo);
    };
  }, [terminado, recargar]);

  // Reloj para el paso automático recibido → preparando
  useEffect(() => {
    if (pedido.status !== "recibido") return;
    const falta = new Date(pedido.created_at).getTime() + pedido.prep_delay_minutes * 60_000 - Date.now();
    if (falta <= 0) return;
    const t = setTimeout(() => setAhora(Date.now()), falta + 50);
    return () => clearTimeout(t);
  }, [pedido.status, pedido.created_at, pedido.prep_delay_minutes]);

  const tipo = pedido.type ?? "domicilio";
  const estado = estadoVisible(pedido, ahora);
  const copia = copiaDe(estado, pedido, restaurante, mascota === "tato");
  const pasos = PASOS[tipo];
  const indice = Math.max(0, pasos.findIndex((p) => p.estado === estado));

  return (
    <div>
      <section className="overflow-hidden rounded-[1.75rem] bg-surface-2 sticker">
        <div className="flex items-center justify-between gap-3 border-b-2 border-outline bg-surface px-5 py-3">
          <p className="font-display text-lg font-extrabold">
            Pedido <span className="tabular">#{pedido.number}</span>
          </p>
          <p className="text-sm text-ink-soft">
            {tipo === "recoger" ? "Para recoger · " : ""}Hecho a las {hora(pedido.created_at)}
          </p>
        </div>

        <div className="flex flex-col items-center px-5 pt-6 pb-6 text-center">
          <Tato pose={copia.pose} mascota={mascota} priority sizes="(min-width: 768px) 220px, 170px" className="w-[170px] md:w-[220px]" />
          <div aria-live="polite" className="mt-5">
            <h1 key={estado} className="aparecer font-display text-[1.9rem] leading-tight font-extrabold tracking-tight md:text-4xl">
              {copia.titulo}
            </h1>
            <p key={`${estado}-t`} className="aparecer mx-auto mt-2 max-w-[34ch] text-ink-soft [animation-delay:60ms]">
              {copia.texto}
            </p>
            {estado === "listo_recoger" && restaurante.mapa && (
              <a href={restaurante.mapa} target="_blank" rel="noopener" className="btn mt-4">
                Cómo llegar
              </a>
            )}
          </div>
        </div>

        {estado !== "cancelado" && (
          <CaminoPedido indice={indice} pasos={pasos.map((p) => p.corto)} icono={tipo === "domicilio" ? "moto" : "bolsa"} />
        )}
      </section>

      <section className="mt-6 rounded-[1.75rem] border-2 border-line bg-surface p-5">
        <h2 className="font-display text-xl font-extrabold">Detalle</h2>
        <ul className="mt-2 divide-y-2 divide-line">
          {pedido.items.map((i, n) => (
            <li key={n} className="flex justify-between gap-4 py-2.5">
              <span className="min-w-0 break-words">
                <span className="tabular font-bold">{i.quantity}×</span> {i.name}
              </span>
              <span className="tabular shrink-0">{cop(i.line_total)}</span>
            </li>
          ))}
        </ul>
        <dl className="tabular mt-2 space-y-1 border-t-2 border-outline pt-3 text-[15px]">
          {tipo === "domicilio" && (
            <div className="flex justify-between text-ink-soft">
              <dt>Domicilio</dt>
              <dd>{pedido.delivery_fee > 0 ? cop(pedido.delivery_fee) : "Gratis"}</dd>
            </div>
          )}
          <div className="flex justify-between text-lg font-extrabold">
            <dt>Total</dt>
            <dd>{cop(pedido.total)}</dd>
          </div>
        </dl>
        <dl className="mt-4 grid gap-3 rounded-2xl bg-surface-2 p-4 text-sm sm:grid-cols-2">
          {tipo === "domicilio" ? (
            <div>
              <dt className="font-bold">Entrega en</dt>
              <dd className="break-words text-ink-soft">{pedido.address}</dd>
            </div>
          ) : tipo === "recoger" ? (
            <div>
              <dt className="font-bold">Recoges en</dt>
              <dd className="break-words text-ink-soft">
                {restaurante.direccion ?? restaurante.nombre}
                {pedido.pickup_at ? ` · hacia las ${horaDe(pedido.pickup_at, restaurante.timezone)}` : ""}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="font-bold">{tipo === "recoger" ? "Pago al recoger" : "Pago al recibir"}</dt>
            <dd className="text-ink-soft">{pedido.payment_method === "efectivo" ? "Efectivo" : "Transferencia"}</dd>
          </div>
        </dl>
        <p className="mt-4 text-center text-xs text-ink-soft">
          Esta página se actualiza sola. Puedes guardarla para volver a ver tu pedido.
        </p>
      </section>
    </div>
  );
}
