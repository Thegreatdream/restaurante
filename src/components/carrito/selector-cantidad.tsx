"use client";

import { carrito } from "@/lib/carrito";
import { Mas, Menos } from "@/components/iconos";

/** [−] 2 [+]  — o solo [+] cuando aún no está en el carrito. */
export function SelectorCantidad({
  producto,
  cantidad,
}: {
  producto: { id: string; name: string; price: number; badge?: string | null };
  cantidad: number;
}) {
  if (cantidad === 0) {
    return (
      <button
        type="button"
        onClick={() => carrito.agregar(producto)}
        className="btn-icon is-add shadow-[2px_2px_0_var(--shadow)]"
        aria-label={`Agregar ${producto.name}`}
      >
        <Mas />
      </button>
    );
  }
  return (
    <div className="flex items-center gap-1.5 rounded-full" role="group" aria-label={`Cantidad de ${producto.name}`}>
      <button
        type="button"
        onClick={() => carrito.quitar(producto.id)}
        className="btn-icon"
        aria-label={cantidad === 1 ? `Quitar ${producto.name}` : `Una ${producto.name} menos`}
      >
        <Menos />
      </button>
      <span className="tabular w-6 text-center text-base font-bold" aria-live="polite">
        {cantidad}
      </span>
      <button
        type="button"
        onClick={() => carrito.agregar(producto)}
        className="btn-icon is-add"
        aria-label={`Una ${producto.name} más`}
        disabled={cantidad >= 20}
      >
        <Mas />
      </button>
    </div>
  );
}
