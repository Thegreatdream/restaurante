"use client";

import { useCallback, useEffect, useState } from "react";
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

type Dibujo = "libreta" | "olla" | "moto" | "bolsa" | "plato" | "listo" | "cancelado";
type Copia = { dibujo: Dibujo; titulo: string; texto: string };

function copiaDe(estado: EstadoPedido, p: PedidoPublico, r: Restaurante, hayContacto: boolean): Copia {
  // Sin correo no prometemos avisos por correo: la página misma avisa.
  const conCorreo = p.has_email !== false;
  switch (estado) {
    case "por_confirmar":
      return {
        dibujo: "libreta",
        titulo: "Esperando al mesero",
        texto: "Un mesero confirmará tu mesa en un momento y tu pedido pasará a la cocina.",
      };
    case "recibido":
      return {
        dibujo: "libreta",
        titulo: "Recibimos tu pedido",
        texto: "Ya lo tenemos anotado. En un momento pasa a la cocina.",
      };
    case "preparando":
      return {
        dibujo: "olla",
        titulo: "Tu pedido se está preparando",
        texto:
          p.type === "recoger"
            ? `${conCorreo ? "Te avisamos por correo cuando esté listo" : "Aquí verás cuando esté listo"}${p.pickup_at ? `. Lo tendremos para las ${horaDe(p.pickup_at, r.timezone)}` : ""}.`
            : p.type === "mesa"
              ? "En un momento lo llevamos a tu mesa."
              : `Lo llevaremos lo más pronto posible. ${conCorreo ? "Te avisaremos cuando salga." : "Aquí verás cuando salga."}`,
      };
    case "en_camino":
      return {
        dibujo: "moto",
        titulo: "Tu pedido va en camino",
        texto: `${conCorreo ? "Te enviamos un correo. " : ""}Ten listo el pago para recibirlo.`,
      };
    case "listo_recoger":
      return {
        dibujo: "bolsa",
        titulo: "¡Tu pedido está listo!",
        texto: r.direccion ? `Pasa por él a ${r.direccion}. Te esperamos.` : `Pasa por él a ${r.nombre}. Te esperamos.`,
      };
    case "va_mesa":
      return { dibujo: "plato", titulo: "Va para tu mesa", texto: "En un momento lo tienes servido." };
    case "entregado":
      return { dibujo: "listo", titulo: "¡Buen provecho!", texto: `Gracias por pedir en ${r.nombre}. Te esperamos la próxima vez.` };
    case "cancelado":
      return {
        dibujo: "cancelado",
        titulo: "Tu pedido fue cancelado",
        texto: hayContacto
          ? "No pudimos atenderlo esta vez. Escríbenos o llámanos y te ayudamos."
          : `No pudimos atenderlo esta vez. Comunícate con ${r.nombre} y te ayudamos.`,
      };
  }
}

/** Dibujo de línea fina para cada momento del pedido, dentro del sello verde de la casa. */
function DibujoEstado({ dibujo }: { dibujo: Dibujo }) {
  const trazos: Record<Dibujo, React.ReactNode> = {
    libreta: (
      <>
        <path d="M11 6h10a2 2 0 0 1 2 2v17a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" />
        <path d="M13 4h6v4h-6ZM13 14h6M13 18h6M13 22h3" />
      </>
    ),
    olla: (
      <>
        <path d="M7 15h18v6a5 5 0 0 1-5 5h-8a5 5 0 0 1-5-5ZM4 15h24M13 15v-2h6v2" />
        <path d="M12 9c-1-1.5 1-2.5 0-4M16 9c-1-1.5 1-2.5 0-4M20 9c-1-1.5 1-2.5 0-4" />
      </>
    ),
    moto: (
      <>
        <circle cx="8" cy="22" r="4" />
        <circle cx="24.5" cy="22" r="4" />
        <path d="M8 22h9l4-8h-5M21 14l3.5 8M22 9h3l-2 5M12 14H7l-1.5 4" />
      </>
    ),
    bolsa: (
      <>
        <path d="M7 11h18l-1.5 15h-15Z" />
        <path d="M12 11V9a4 4 0 0 1 8 0v2M12.5 18.5c1.5 2 5.5 2 7 0" />
      </>
    ),
    plato: (
      <>
        <path d="M5 22h22M7 22a9 9 0 0 1 18 0M16 13v-2.5" />
        <circle cx="16" cy="9" r="1.5" />
        <path d="M4 26h24" />
      </>
    ),
    listo: <path d="m8 16.5 5.5 5.5L24 10.5" />,
    cancelado: <path d="M10 10l12 12M22 10 10 22" />,
  };
  return (
    <span
      key={dibujo}
      aria-hidden
      className={`aparecer grid size-24 place-items-center rounded-full md:size-28 ${
        dibujo === "cancelado" ? "bg-coral-soft text-coral-ink" : "bg-band text-brand"
      }`}
    >
      <svg viewBox="0 0 32 32" className="size-12 md:size-14" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        {trazos[dibujo]}
      </svg>
    </span>
  );
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
  restaurante,
  hayContacto = false,
}: {
  inicial: PedidoPublico;
  restaurante: Restaurante;
  /** Si el restaurante tiene WhatsApp o teléfono configurado (para el mensaje de pedido cancelado). */
  hayContacto?: boolean;
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
  const copia = copiaDe(estado, pedido, restaurante, hayContacto);
  const pasos = PASOS[tipo];
  const indice = Math.max(0, pasos.findIndex((p) => p.estado === estado));

  return (
    <div>
      <section className="overflow-hidden rounded-lg bg-surface sticker">
        <div className="flex items-baseline justify-between gap-3 border-b border-line px-5 py-3.5">
          <p className="antetitulo text-ink">
            Pedido <span className="tabular">#{pedido.number}</span>
          </p>
          <p className="text-sm text-ink-soft">
            {tipo === "recoger" ? "Para recoger · " : ""}Hecho a las {hora(pedido.created_at)}
          </p>
        </div>

        <div className="flex flex-col items-center px-5 pt-9 pb-8 text-center">
          <DibujoEstado dibujo={copia.dibujo} />
          <div aria-live="polite" className="mt-6">
            <h1 key={estado} className="aparecer font-display text-[2.1rem] leading-[1.1] md:text-5xl">
              {copia.titulo}
            </h1>
            <p key={`${estado}-t`} className="aparecer mx-auto mt-3 max-w-[34ch] leading-relaxed text-ink-soft [animation-delay:60ms]">
              {copia.texto}
            </p>
            {estado === "listo_recoger" && restaurante.mapa && (
              <a href={restaurante.mapa} target="_blank" rel="noopener" className="btn mt-5">
                Cómo llegar
              </a>
            )}
          </div>
        </div>

        {estado !== "cancelado" && estado !== "por_confirmar" && (
          <CaminoPedido indice={indice} pasos={pasos.map((p) => p.corto)} icono={tipo === "domicilio" ? "moto" : "bolsa"} />
        )}
      </section>

      <section className="mt-6 rounded-lg border border-line bg-surface p-5">
        <h2 className="font-display text-2xl">Detalle</h2>
        <ul className="mt-2 divide-y divide-line">
          {pedido.items.map((i, n) => (
            <li key={n} className="flex justify-between gap-4 py-2.5">
              <span className="min-w-0 break-words">
                <span className="tabular font-semibold">{i.quantity}×</span> {i.name}
              </span>
              <span className="tabular shrink-0">{cop(i.line_total)}</span>
            </li>
          ))}
        </ul>
        {pedido.notes && (
          <p className="mt-1 border-t border-line pt-3 text-sm break-words text-ink-soft">
            <span className="font-semibold text-ink">Tus notas:</span> {pedido.notes}
          </p>
        )}
        <dl className="tabular mt-3 space-y-1 border-t border-outline pt-3 text-[15px]">
          {tipo === "domicilio" && (
            <div className="flex justify-between text-ink-soft">
              <dt>Domicilio</dt>
              <dd>{pedido.delivery_fee > 0 ? cop(pedido.delivery_fee) : "Gratis"}</dd>
            </div>
          )}
          <div className="flex justify-between text-lg font-semibold">
            <dt>Total</dt>
            <dd>{cop(pedido.total)}</dd>
          </div>
        </dl>
        <dl className="mt-4 grid gap-3 rounded-md bg-surface-2 p-4 text-sm sm:grid-cols-2">
          {tipo === "domicilio" ? (
            <div>
              <dt className="font-semibold">Entrega en</dt>
              <dd className="break-words text-ink-soft">{pedido.address}</dd>
            </div>
          ) : tipo === "recoger" ? (
            <div>
              <dt className="font-semibold">Recoges en</dt>
              <dd className="break-words text-ink-soft">
                {restaurante.direccion ?? restaurante.nombre}
                {pedido.pickup_at ? ` · hacia las ${horaDe(pedido.pickup_at, restaurante.timezone)}` : ""}
              </dd>
            </div>
          ) : (
            <div>
              <dt className="font-semibold">Mesa</dt>
              <dd className="text-ink-soft">{pedido.table_label ?? ""}</dd>
            </div>
          )}
          <div>
            <dt className="font-semibold">{tipo === "mesa" ? "Pago" : tipo === "recoger" ? "Pago al recoger" : "Pago al recibir"}</dt>
            <dd className="text-ink-soft">
              {tipo === "mesa" ? "En la cuenta de la mesa" : pedido.payment_method === "efectivo" ? "Efectivo" : "Transferencia"}
            </dd>
          </div>
        </dl>
        {!terminado && (
          <p className="mt-4 text-center text-xs text-ink-soft">
            Esta página se actualiza sola. Puedes guardarla para volver a ver tu pedido.
          </p>
        )}
      </section>
    </div>
  );
}
