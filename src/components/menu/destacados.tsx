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

/** Recomendados: tarjetas con foto grande que se deslizan con el dedo. */
export function Destacados({ categorias, titulo = "Recomendados de la casa" }: { categorias: Categoria[]; titulo?: string }) {
  const { items } = useCarrito();
  const platos = elegir(categorias);
  if (platos.length < 3) return null;

  return (
    <section aria-labelledby="t-destacados" className="mt-14 md:mt-20">
      <p className="antetitulo text-ink-soft">Para empezar</p>
      <h2 id="t-destacados" className="mt-2 font-display text-4xl tracking-wide uppercase md:text-5xl">
        {titulo}
      </h2>
      <ul className="carril -mx-4 mt-7 flex gap-5 overflow-x-auto px-4 pt-1 pb-4 md:mx-0 md:px-0">
        {platos.map((p) => {
          const cantidad = items.find((i) => i.id === p.id)?.qty ?? 0;
          return (
            <li key={p.id} className="levanta flex w-[272px] shrink-0 flex-col overflow-hidden rounded-lg bg-surface sticker md:w-[300px]">
              <ImagenPlato slug={p.slug} nombre={p.name} imagen={p.image_url} sizes="300px" className="aspect-[4/3]" />
              <div className="flex flex-1 flex-col p-5">
                {p.badge && <span className="antetitulo mb-2 block text-[11px] text-hoja">{p.badge}</span>}
                <h3 className="font-display text-2xl leading-tight">{p.name}</h3>
                <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                  <p className="tabular text-base font-medium whitespace-nowrap">{cop(p.price)}</p>
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
