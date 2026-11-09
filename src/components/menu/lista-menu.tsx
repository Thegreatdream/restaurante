"use client";

import { useCarrito } from "@/lib/carrito";
import { cop } from "@/lib/formato";
import type { Categoria } from "@/lib/tipos";
import { SelectorCantidad } from "@/components/carrito/selector-cantidad";

export function ListaMenu({ categorias }: { categorias: Categoria[] }) {
  const { items } = useCarrito();
  const cantidadDe = (id: string) => items.find((i) => i.id === id)?.qty ?? 0;

  return (
    <div className="space-y-9 pb-32 md:pb-16">
      {categorias.map((c) => (
        <section key={c.id} id={c.slug} aria-labelledby={`t-${c.slug}`} className="scroll-mt-20">
          <h2 id={`t-${c.slug}`} className="font-display text-2xl font-extrabold tracking-tight">
            {c.name}
          </h2>
          <ul className="mt-3 divide-y-2 divide-line overflow-hidden rounded-2xl border-2 border-line bg-surface">
            {c.products.map((p) => {
              const cantidad = cantidadDe(p.id);
              return (
                <li
                  key={p.id}
                  className={`flex gap-4 p-4 transition-colors duration-200 ${cantidad > 0 ? "bg-surface-2/60" : ""}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <h3 className="text-[17px] leading-tight font-bold break-words">{p.name}</h3>
                      {p.badge && (
                        <span className="rounded-full bg-coral-soft px-2 py-0.5 text-[11px] font-bold tracking-wide text-coral uppercase">
                          {p.badge}
                        </span>
                      )}
                    </div>
                    {p.description && (
                      <p className="mt-1 line-clamp-2 text-sm leading-snug text-ink-soft">{p.description}</p>
                    )}
                    <p className="tabular mt-2 text-[15px] font-bold">{cop(p.price)}</p>
                  </div>
                  <div className="flex shrink-0 items-center self-center">
                    <SelectorCantidad producto={{ id: p.id, name: p.name, price: p.price }} cantidad={cantidad} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
