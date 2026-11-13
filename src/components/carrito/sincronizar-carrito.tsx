"use client";

import { useEffect, useState } from "react";
import { carrito, type CambiosCarrito } from "@/lib/carrito";

/**
 * Pone el carrito guardado al día con el menú de hoy: quita los platos que ya no están
 * (agotados o retirados) y actualiza nombres y precios. Si algo cambió, se lo dice al cliente
 * con un aviso claro, en vez de dejar que el pedido falle al final.
 */
export function SincronizarCarrito({
  productos,
  className = "",
}: {
  /** Los platos disponibles ahora mismo. */
  productos: { id: string; name: string; price: number }[];
  className?: string;
}) {
  const [cambios, setCambios] = useState<CambiosCarrito | null>(null);

  useEffect(() => {
    const c = carrito.sincronizar(productos);
    // El carrito vive en el celular (localStorage): solo se puede comparar ya en el navegador.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (c.quitados.length || c.precios.length) setCambios(c);
  }, [productos]);

  if (!cambios) return null;
  const { quitados, precios } = cambios;

  return (
    <div role="status" className={`aparecer rounded-lg border border-outline bg-surface px-4 py-3 text-sm leading-snug ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="font-semibold">Actualizamos tu pedido con el menú de hoy</p>
          {quitados.length > 0 && (
            <p className="text-ink-soft">
              {quitados.length === 1 ? "Ya no está disponible y lo quitamos: " : "Ya no están disponibles y los quitamos: "}
              <span className="text-ink">{quitados.join(", ")}</span>.
            </p>
          )}
          {precios.length > 0 && (
            <p className="text-ink-soft">
              {precios.length === 1 ? "Cambió de precio: " : "Cambiaron de precio: "}
              <span className="text-ink">{precios.join(", ")}</span>.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setCambios(null)}
          className="-my-1 -mr-2 min-h-11 shrink-0 px-2 text-xs font-semibold tracking-[0.1em] text-ink-soft uppercase underline underline-offset-4"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
