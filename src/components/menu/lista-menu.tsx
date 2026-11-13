"use client";

import { useCarrito } from "@/lib/carrito";
import { cop } from "@/lib/formato";
import type { Categoria } from "@/lib/tipos";
import { SelectorCantidad } from "@/components/carrito/selector-cantidad";
import { ImagenPlato } from "./imagen-plato";
import { useRef } from "react";
import { CON_MOVIMIENTO, gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";

/**
 * La carta por categorías. Cada plato es una tarjeta con su foto arriba:
 * una columna en el celular, dos en tableta y computador, tres en pantallas anchas.
 */
export function ListaMenu({ categorias }: { categorias: Categoria[] }) {
  const { items } = useCarrito();
  const cantidadDe = (id: string) => items.find((i) => i.id === id)?.qty ?? 0;
  const raiz = useRef<HTMLDivElement>(null);

  // Al bajar: el título de cada categoría sube y sus platos aparecen en cascada (solo la primera vez).
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(CON_MOVIMIENTO, () => {
        gsap.utils.toArray<HTMLElement>("[data-revelar='titulo']").forEach((titulo) => {
          gsap.from(titulo.children, {
            y: 22,
            autoAlpha: 0,
            duration: 0.8,
            stagger: 0.08,
            ease: "power3.out",
            scrollTrigger: { trigger: titulo, start: "top 88%", once: true },
          });
        });

        const tarjetas = gsap.utils.toArray<HTMLElement>("[data-revelar='plato']");
        // Sin transición CSS mientras GSAP mueve la tarjeta (la clase .levanta anima transform al pasar el mouse)
        gsap.set(tarjetas, { autoAlpha: 0, y: 28, transition: "none" });
        ScrollTrigger.batch(tarjetas, {
          start: "top 92%",
          once: true,
          onEnter: (lote) =>
            gsap.to(lote, {
              autoAlpha: 1,
              y: 0,
              duration: 0.75,
              stagger: 0.09,
              ease: "power3.out",
              overwrite: true,
              clearProps: "transform,opacity,visibility,transition",
            }),
        });
      });
    },
    { scope: raiz },
  );

  return (
    <div ref={raiz} className="space-y-16 pb-20 md:space-y-20">
      {categorias.map((c, i) => (
        <section key={c.id} id={c.slug} aria-labelledby={`t-${c.slug}`} className="scroll-mt-20">
          <div data-revelar="titulo">
            <p className="antetitulo text-ink-soft">{String(i + 1).padStart(2, "0")}</p>
            <h2 id={`t-${c.slug}`} className="mt-1 font-display text-4xl tracking-wide uppercase md:text-[2.75rem]">
              {c.name}
            </h2>
          </div>
          <ul className="mt-6 grid gap-5 @lg:grid-cols-2 @5xl:grid-cols-3">
            {c.products.map((p) => {
              const cantidad = cantidadDe(p.id);
              return (
                <li
                  key={p.id}
                  data-revelar="plato"
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
