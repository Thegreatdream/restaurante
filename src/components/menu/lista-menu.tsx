"use client";

import { useCarrito } from "@/lib/carrito";
import { cop } from "@/lib/formato";
import type { Categoria } from "@/lib/tipos";
import { SelectorCantidad } from "@/components/carrito/selector-cantidad";
import { ImagenPlato } from "./imagen-plato";

/**
 * La carta por categorías. Cada plato es una tarjeta con su foto arriba:
 * una columna en el celular, dos en tableta y computador, tres en pantallas anchas.
 */
export function ListaMenu({ categorias }: { categorias: Categoria[] }) {
  const { items } = useCarrito();
  const cantidadDe = (id: string) => items.find((i) => i.id === id)?.qty ?? 0;

  return (
    <div className="space-y-16 pb-20 md:space-y-20">
      {categorias.map((c, i) => (
        <section key={c.id} id={c.slug} aria-labelledby={`t-${c.slug}`} className="scroll-mt-20">
          <p className="antetitulo text-ink-soft">{String(i + 1).padStart(2, "0")}</p>
          <h2 id={`t-${c.slug}`} className="mt-1 font-display text-4xl tracking-wide uppercase md:text-[2.75rem]">
            {c.name}
          </h2>
          <ul className="mt-6 grid gap-5 @lg:grid-cols-2 @5xl:grid-cols-3">
            {c.products.map((p) => {
              const cantidad = cantidadDe(p.id);
              return (
                <li
                  key={p.id}
                  className={`levanta flex flex-col overflow-hidden rounded-lg border bg-surface shadow-[var(--sombra-suave)] transition-colors duration-200 ${
                    cantidad > 0 ? "border-brand" : "border-line"
                  }`}
                >
                  <ImagenPlato
                    slug={c.slug}
                    nombre={p.name}
                    imagen={p.image_url}
                    sizes="(min-width: 1024px) 340px, (min-width: 640px) 50vw, 100vw"
                    className="aspect-[16/10]"
                  />
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex-1 pb-5">
                      {p.badge && <span className="antetitulo mb-2 block text-[11px] text-hoja">{p.badge}</span>}
                      <h3 className="font-display text-[1.65rem] leading-tight break-words">{p.name}</h3>
                      {p.description && <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{p.description}</p>}
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
                      <p className="tabular text-[17px] font-medium whitespace-nowrap">{cop(p.price)}</p>
                      <SelectorCantidad producto={{ id: p.id, name: p.name, price: p.price, badge: p.badge }} cantidad={cantidad} />
                    </div>
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
