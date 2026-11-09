"use client";

import { useState } from "react";
import { Drawer } from "vaul";
import { useCarrito } from "@/lib/carrito";
import { cop } from "@/lib/formato";
import type { Ajustes } from "@/lib/tipos";
import { ResumenCarrito } from "./resumen-carrito";
import { Bolsa } from "@/components/iconos";

/** Celular: barra fija abajo + hoja inferior que se arrastra (Vaul). */
export function CarritoMovil({ ajustes }: { ajustes: Ajustes }) {
  const { cantidad, subtotal } = useCarrito();
  const [abierto, setAbierto] = useState(false);
  const visible = cantidad > 0;

  // El contador "late" cada vez que se agrega algo; la hoja se cierra si el carrito queda vacío.
  const [latido, setLatido] = useState(0);
  const [anterior, setAnterior] = useState(cantidad);
  if (anterior !== cantidad) {
    setAnterior(cantidad);
    if (cantidad > anterior) setLatido((n) => n + 1);
    if (cantidad === 0) setAbierto(false);
  }

  return (
    <Drawer.Root open={abierto} onOpenChange={setAbierto}>
      <div
        className={`pb-safe fixed inset-x-0 bottom-0 z-30 px-4 pt-3 transition-[transform,opacity] duration-300 ease-[var(--ease-out)] md:hidden ${
          visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0"
        }`}
        aria-hidden={!visible}
      >
        <Drawer.Trigger asChild>
          <button type="button" className="btn w-full justify-between pr-2 pl-4" tabIndex={visible ? 0 : -1}>
            <span className="flex items-center gap-2">
              <Bolsa />
              Ver mi pedido
            </span>
            <span className="flex items-center gap-2">
              <span className="tabular">{cop(subtotal + ajustes.delivery_fee)}</span>
              <span
                key={latido}
                className="latido tabular grid h-9 min-w-9 place-items-center rounded-full bg-[#1e1a17] px-2 text-sm text-[#fff8ec]"
              >
                {cantidad}
              </span>
            </span>
          </button>
        </Drawer.Trigger>
      </div>

      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/45" />
        <Drawer.Content
          className="pb-safe fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col rounded-t-[1.75rem] border-2 border-b-0 border-outline bg-bg outline-none"
          aria-describedby={undefined}
        >
          <div aria-hidden className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-line" />
          <Drawer.Title className="px-5 pt-3 font-display text-2xl font-extrabold">Tu pedido</Drawer.Title>
          <div className="overflow-y-auto overscroll-contain px-5 pb-2">
            <ResumenCarrito ajustes={ajustes} />
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
