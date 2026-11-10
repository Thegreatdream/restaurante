"use client";

import Link from "next/link";
import { useCarrito, useHidratado } from "@/lib/carrito";
import { textoApertura } from "@/lib/apertura";
import { Tato } from "@/components/tato";
import { cop } from "@/lib/formato";
import type { Ajustes } from "@/lib/tipos";
import { SelectorCantidad } from "./selector-cantidad";
import { Flecha } from "@/components/iconos";

/** Contenido del carrito: lo usan el panel lateral (escritorio) y la hoja inferior (celular). */
export function ResumenCarrito({
  ajustes,
  conBoton = true,
  costoEnvio,
}: {
  ajustes: Ajustes;
  conBoton?: boolean;
  /** Costo del domicilio a mostrar. null = sin domicilio (para recoger). Por defecto, el del restaurante si ofrece domicilio. */
  costoEnvio?: number | null;
}) {
  const { items, subtotal, cantidad } = useCarrito();
  const hidratado = useHidratado();
  const envio = costoEnvio === undefined ? (ajustes.mod_delivery ? ajustes.delivery_fee : null) : costoEnvio;
  const total = subtotal + (envio ?? 0);
  const faltaMinimo = ajustes.min_order > 0 && subtotal < ajustes.min_order;

  if (!hidratado) {
    // Mientras se lee el carrito guardado: reservar espacio, sin mostrar "vacío" por error.
    return (
      <div aria-hidden className="space-y-3 py-4">
        <div className="h-4 w-3/4 rounded-full bg-line" />
        <div className="h-4 w-1/2 rounded-full bg-line" />
      </div>
    );
  }

  if (cantidad === 0) {
    return (
      <div className="flex items-center gap-4 py-4">
        <Tato pose="libreta" mascota={ajustes.mascot} quieto sizes="56px" className="w-12 shrink-0" />
        <div>
          <p className="font-display text-lg leading-tight font-bold">{ajustes.mascot === "tato" ? "Tato espera tu pedido" : "Tu pedido está vacío"}</p>
          <p className="mt-1 text-sm text-ink-soft">Toca + en cualquier plato para agregarlo.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <ul className="divide-y-2 divide-line">
        {items.map((i) => (
          <li key={i.id} className="flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="leading-tight font-semibold break-words">{i.name}</p>
              <p className="tabular mt-0.5 text-sm text-ink-soft">{cop(i.price * i.qty)}</p>
            </div>
            <SelectorCantidad producto={i} cantidad={i.qty} />
          </li>
        ))}
      </ul>

      <dl className="tabular mt-3 space-y-1.5 border-t-2 border-outline pt-3 text-[15px]">
        <div className="flex justify-between text-ink-soft">
          <dt>Subtotal</dt>
          <dd>{cop(subtotal)}</dd>
        </div>
        {envio !== null && (
          <div className="flex justify-between text-ink-soft">
            <dt>Domicilio</dt>
            <dd>{envio > 0 ? cop(envio) : "Gratis"}</dd>
          </div>
        )}
        <div className="flex justify-between pt-1 text-lg font-extrabold">
          <dt>Total</dt>
          <dd>{cop(total)}</dd>
        </div>
      </dl>

      {faltaMinimo && (
        <p className="mt-3 rounded-xl bg-coral-soft px-3 py-2 text-sm font-semibold text-coral-ink">
          El pedido mínimo es {cop(ajustes.min_order)}. Te faltan {cop(ajustes.min_order - subtotal)}.
        </p>
      )}

      {conBoton &&
        (ajustes.estado.open ? (
          <Link
            href="/checkout"
            aria-disabled={faltaMinimo}
            className={`btn mt-4 w-full ${faltaMinimo ? "pointer-events-none opacity-55" : ""}`}
          >
            {ajustes.mod_delivery ? "Continuar con la entrega" : "Continuar"} <Flecha />
          </Link>
        ) : (
          <p className="mt-4 rounded-2xl bg-surface-2 px-4 py-3 text-center text-sm font-semibold">
            {textoApertura(ajustes).aviso}
          </p>
        ))}
    </div>
  );
}
