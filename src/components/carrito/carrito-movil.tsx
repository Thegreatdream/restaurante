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
      {/* La barra solo existe cuando hay platos: nunca muestra un total con el carrito vacío. */}
      {visible && (
        <div className="barra-entra pb-safe fixed inset-x-0 bottom-0 z-30 px-4 pt-3 md:hidden">
          <Drawer.Trigger asChild>
            <button type="button" className="btn w-full justify-between pr-5 pl-3">
              <span className="flex items-center gap-2.5">
                {/* Contador sobre la bolsa, separado del precio para que no se lean juntos */}
                <span className="relative grid size-9 place-items-center">
                  <Bolsa />
                  <span
                    key={latido}
                    className="latido tabular absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#1e1a17] px-1 text-[11px] leading-none text-[#fff8ec]"
                    aria-hidden
                  >
                    {cantidad}
                  </span>
                </span>
                Ver mi pedido
                <span className="sr-only">
                  , {cantidad} {cantidad === 1 ? "plato" : "platos"}
                </span>
              </span>
              <span className="tabular">{cop(subtotal + ajustes.delivery_fee)}</span>
            </button>
          </Drawer.Trigger>
        </div>
      )}

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
