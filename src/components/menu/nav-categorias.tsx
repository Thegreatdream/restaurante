"use client";

import { useEffect, useRef, useState } from "react";
import type { Categoria } from "@/lib/tipos";
import { IconoCategoria } from "@/components/iconos-categoria";

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
      className="barra-material sticky top-0 z-10 -mx-4 mt-5 px-4 pt-[env(safe-area-inset-top)] md:mx-0 md:px-0"
    >
      <div ref={barra} className="flex gap-2 overflow-x-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categorias.map((c) => {
          const esActiva = c.slug === activa;
          return (
            <a
              key={c.id}
              href={`#${c.slug}`}
              data-slug={c.slug}
              aria-current={esActiva ? "true" : undefined}
              onClick={() => setActiva(c.slug)}
              className={`flex min-h-11 shrink-0 items-center gap-2 rounded-full border-2 pr-4 pl-3 text-sm font-bold whitespace-nowrap transition-colors duration-150 ${
                esActiva
                  ? "border-outline bg-ink text-bg [--icono-relleno:var(--brand)]"
                  : "border-line bg-surface text-ink [--icono-relleno:var(--surface-2)]"
              }`}
            >
              <IconoCategoria slug={c.slug} className="size-5 shrink-0" />
              {c.name}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
