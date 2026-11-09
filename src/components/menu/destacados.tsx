"use client";

import { useCarrito } from "@/lib/carrito";
import { cop } from "@/lib/formato";
import type { Categoria, Producto } from "@/lib/tipos";
import { SelectorCantidad } from "@/components/carrito/selector-cantidad";
import { ImagenPlato } from "./imagen-plato";

/** Elige hasta 6: primero los que tienen etiqueta (favorito, nuevo), luego el primero de cada categoría. */
function elegir(categorias: Categoria[]): (Producto & { slug: string })[] {
  const todos = categorias.flatMap((c) => c.products.map((p) => ({ ...p, slug: c.slug })));
  const conEtiqueta = todos.filter((p) => p.badge);
  const primeros = categorias.map((c) => c.products[0] && { ...c.products[0], slug: c.slug }).filter(Boolean) as (Producto & {
    slug: string;
  })[];
  const vistos = new Set<string>();
  return [...conEtiqueta, ...primeros].filter((p) => !vistos.has(p.id) && vistos.add(p.id)).slice(0, 6);
}

/** Carril de recomendados: tarjetas grandes que se deslizan con el dedo. */
export function Destacados({ categorias }: { categorias: Categoria[] }) {
  const { items } = useCarrito();
  const platos = elegir(categorias);
  if (platos.length < 3) return null;

  return (
    <section aria-labelledby="t-destacados" className="mt-8 md:mt-10">
      <h2 id="t-destacados" className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
        Recomendados de Tato
      </h2>
      <ul className="carril -mx-4 mt-4 flex gap-4 overflow-x-auto px-4 pt-1 pb-3 md:mx-0 md:px-0">
        {platos.map((p) => {
          const cantidad = items.find((i) => i.id === p.id)?.qty ?? 0;
          return (
            <li
              key={p.id}
              className="levanta flex w-[264px] shrink-0 flex-col overflow-hidden rounded-[1.5rem] border-2 border-outline bg-surface shadow-[3px_3px_0_var(--shadow)]"
            >
              <ImagenPlato
                slug={p.slug}
                nombre={p.name}
                imagen={p.image_url}
                sizes="250px"
                className="aspect-[4/3] border-b-2 border-outline"
              />
              <div className="flex flex-1 flex-col p-4">
                {p.badge && (
                  <span className="mb-1.5 self-start rounded-full bg-coral-soft px-2 py-0.5 text-[11px] font-bold tracking-wide text-coral-ink uppercase">
                    {p.badge}
                  </span>
                )}
                <h3 className="text-[17px] leading-tight font-bold">{p.name}</h3>
                <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                  <p className="tabular text-base font-extrabold whitespace-nowrap">{cop(p.price)}</p>
                  <SelectorCantidad producto={{ id: p.id, name: p.name, price: p.price, badge: p.badge }} cantidad={cantidad} />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
