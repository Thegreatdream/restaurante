"use client";

import { useEffect, useRef, useState } from "react";
import type { Categoria } from "@/lib/tipos";

/** Pestañas de categorías: se quedan arriba al bajar y marcan la sección visible. */
export function NavCategorias({ categorias }: { categorias: Categoria[] }) {
  const [activa, setActiva] = useState(categorias[0]?.slug);
  const barra = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const secciones = categorias
      .map((c) => document.getElementById(c.slug))
      .filter((e): e is HTMLElement => Boolean(e));
    const obs = new IntersectionObserver(
      (entradas) => {
        const visible = entradas.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiva(visible.target.id);
      },
      { rootMargin: "-120px 0px -60% 0px" },
    );
    secciones.forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, [categorias]);

  // Mantiene la pestaña activa a la vista en la barra horizontal
  useEffect(() => {
    const boton = barra.current?.querySelector<HTMLElement>(`[data-slug="${activa}"]`);
    boton?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [activa]);

  return (
    <nav
      aria-label="Categorías del menú"
      className="barra-material sticky top-0 z-10 -mx-4 mt-14 mb-10 border-b border-line px-4 pt-[env(safe-area-inset-top)] md:mx-0 md:mt-20 md:px-0"
    >
      <div ref={barra} className="flex gap-7 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categorias.map((c) => {
          const esActiva = c.slug === activa;
          return (
            <a
              key={c.id}
              href={`#${c.slug}`}
              data-slug={c.slug}
              aria-current={esActiva ? "true" : undefined}
              onClick={() => setActiva(c.slug)}
              className={`-mb-px flex min-h-12 shrink-0 items-center border-b-2 text-[13px] font-medium tracking-[0.16em] whitespace-nowrap uppercase transition-colors duration-150 ${
                esActiva ? "border-brand text-ink" : "border-transparent text-ink-soft hover:text-ink"
              }`}
            >
              {c.name}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
