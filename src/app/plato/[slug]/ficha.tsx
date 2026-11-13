"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { carrito, useCarrito } from "@/lib/carrito";
import { cop } from "@/lib/formato";
import { CON_MOVIMIENTO, gsap, SplitText, useGSAP } from "@/lib/gsap";
import { SelectorCantidad } from "@/components/carrito/selector-cantidad";
import { ImagenPlato } from "@/components/menu/imagen-plato";
import { Atras, Flecha } from "@/components/iconos";
import { esFotoRecortada } from "@/lib/platos";

export type PlatoFicha = {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  etiqueta: string | null;
  foto: string | null;
  categoria: string;
  categoriaSlug: string;
  lema?: string;
  idealPara?: string;
  porcion?: string;
};

export type PlatoOtro = {
  id: string;
  nombre: string;
  precio: number;
  foto: string | null;
  slug: string;
  categoriaSlug: string;
};

/**
 * Ficha del plato, al estilo de una página de producto editorial:
 * nombre gigante que entra letra por letra, el plato como protagonista (gira apenas al bajar),
 * información en columnas, el botón para pedirlo y "otros platos" para seguir antojándose.
 */
export function FichaPlato({ plato, otros }: { plato: PlatoFicha; otros: PlatoOtro[] }) {
  const raiz = useRef<HTMLDivElement>(null);
  const { items } = useCarrito();
  const cantidad = items.find((i) => i.id === plato.id)?.qty ?? 0;
  const producto = { id: plato.id, name: plato.nombre, price: plato.precio, badge: plato.etiqueta };

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(CON_MOVIMIENTO, () => {
        gsap.set("[data-ficha]", { visibility: "visible" });
        const titulo = raiz.current?.querySelector<HTMLElement>("[data-ficha='titulo']");
        const letras = titulo ? SplitText.create(titulo, { type: "words,chars", mask: "chars" }).chars : [];

        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        tl.from("[data-ficha='lados']", { y: 12, autoAlpha: 0, duration: 0.6, stagger: 0.08 })
          .from(letras, { yPercent: 110, duration: 0.9, stagger: 0.03, ease: "power4.out" }, "-=0.3")
          .from("[data-ficha='plato']", { y: 60, scale: 0.92, rotate: -8, autoAlpha: 0, duration: 1.2 }, "-=0.7")
          .from("[data-ficha='compra']", { y: 18, autoAlpha: 0, duration: 0.7 }, "-=0.6");

        // Al bajar: el plato gira despacio y sube un poco, como si se acomodara en la mesa
        gsap.to("[data-ficha='giro']", {
          rotate: 14,
          yPercent: -6,
          ease: "none",
          scrollTrigger: { trigger: "[data-ficha='portada']", start: "top top", end: "bottom top", scrub: true },
        });

        // Las columnas de información y los otros platos aparecen al llegar a ellos
        gsap.utils.toArray<HTMLElement>("[data-ficha='aparece']").forEach((el) => {
          gsap.from(el.children, {
            y: 24,
            autoAlpha: 0,
            duration: 0.8,
            stagger: 0.1,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 85%", once: true },
          });
        });
      });
    },
    { scope: raiz },
  );

  return (
    <main ref={raiz} className="ficha-anim flex-1 overflow-x-clip">
      {/* ---------- Portada de la ficha ---------- */}
      <section data-ficha="portada" className="relative mx-auto w-full max-w-6xl px-4 pt-6 pb-10 md:pt-10">
        <Link href={`/#${plato.categoriaSlug}`} className="inline-flex min-h-11 items-center gap-1.5 text-[13px] tracking-[0.14em] text-ink-soft uppercase hover:text-ink">
          <Atras /> Volver al menú
        </Link>

        <div className="mt-4 flex items-end justify-between gap-4 text-ink-soft">
          <p data-ficha="lados" className="antetitulo">
            {plato.categoria}
          </p>
          <p data-ficha="lados" className="antetitulo hidden text-right sm:block">
            Hecho en casa · cada día
          </p>
        </div>

        <h1
          data-ficha="titulo"
          className="mt-4 text-center font-display text-[clamp(3rem,15vw,10.5rem)] leading-[0.86] font-medium tracking-[0.01em] text-band uppercase"
        >
          {plato.nombre}
        </h1>

        {/* El plato, protagonista: recortado en óvalo para que flote sobre el fondo */}
        <div data-ficha="plato" className="relative z-10 mx-auto -mt-[4vw] w-full max-w-[640px] md:-mt-16">
          <div data-ficha="giro" className={`relative ${esFotoRecortada(plato.foto) ? "aspect-square" : "aspect-[4/3]"}`}>
            {plato.foto && esFotoRecortada(plato.foto) ? (
              <div className="plato-sombra absolute inset-0">
                <Image
                  src={plato.foto}
                  alt={plato.nombre}
                  fill
                  priority
                  sizes="(min-width: 768px) 640px, 92vw"
                  className="object-contain"
                />
              </div>
            ) : plato.foto ? (
              <div className="plato-flotante absolute inset-0">
                <Image
                  src={plato.foto}
                  alt={plato.nombre}
                  fill
                  priority
                  sizes="(min-width: 768px) 640px, 92vw"
                  className="object-cover"
                />
              </div>
            ) : (
              <ImagenPlato
                slug={plato.categoriaSlug}
                nombre={plato.nombre}
                sizes="640px"
                className="absolute inset-[8%] rounded-full"
                iconoClassName="size-[30%]"
              />
            )}
          </div>
        </div>

        {/* Precio y botón de pedir */}
        <div data-ficha="compra" className="relative z-20 mx-auto -mt-6 flex max-w-md flex-col items-center gap-4 text-center md:-mt-10">
          {plato.etiqueta && <p className="antetitulo text-hoja">{plato.etiqueta}</p>}
          <p className="tabular font-display text-4xl">{cop(plato.precio)}</p>
          {cantidad === 0 ? (
            <button type="button" className="btn w-full sm:w-auto" onClick={() => carrito.agregar(producto)}>
              Agregar al pedido
            </button>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-4">
              <SelectorCantidad producto={producto} cantidad={cantidad} />
              <Link href="/checkout" className="btn btn-ghost">
                Ir a pagar <Flecha />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ---------- Información en columnas ---------- */}
      <section className="border-y border-line bg-surface/60">
        <div data-ficha="aparece" className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 md:grid-cols-3 md:gap-12 md:py-20">
          {plato.lema && (
            <p className="font-display text-3xl leading-tight md:col-span-3 md:max-w-[28ch] md:text-4xl">{plato.lema}</p>
          )}
          {plato.descripcion && (
            <div>
              <h2 className="antetitulo text-ink-soft">Qué trae</h2>
              <p className="mt-3 text-[17px] leading-relaxed">{plato.descripcion}</p>
            </div>
          )}
          {plato.idealPara && (
            <div>
              <h2 className="antetitulo text-ink-soft">Ideal para</h2>
              <p className="mt-3 text-[17px] leading-relaxed">{plato.idealPara}</p>
            </div>
          )}
          {plato.porcion && (
            <div>
              <h2 className="antetitulo text-ink-soft">Porción</h2>
              <p className="mt-3 text-[17px] leading-relaxed">{plato.porcion}</p>
            </div>
          )}
        </div>
      </section>

      {/* ---------- Otros platos ---------- */}
      {otros.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-4 py-16 md:py-24">
          <div data-ficha="aparece">
            <p className="antetitulo text-ink-soft">Para seguir antojándote</p>
            <h2 className="mt-2 font-display text-4xl tracking-wide uppercase md:text-5xl">Otros platos</h2>
          </div>
          <ul data-ficha="aparece" className="carril -mx-4 mt-8 flex gap-5 overflow-x-auto px-4 pb-4 md:mx-0 md:px-0">
            {otros.map((o) => (
              <li key={o.id} className="w-[240px] shrink-0 md:w-[260px]">
                <Link href={`/plato/${o.slug}`} className="levanta group block overflow-hidden rounded-lg bg-surface sticker">
                  <ImagenPlato slug={o.categoriaSlug} nombre={o.nombre} imagen={o.foto} sizes="260px" className="aspect-[4/3]" />
                  <div className="p-4">
                    <p className="font-display text-xl leading-tight">{o.nombre}</p>
                    <p className="tabular mt-1 text-[15px] text-ink-soft">{cop(o.precio)}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
