"use client";

import { useRef } from "react";
import { CON_MOVIMIENTO, SIN_MOVIMIENTO, gsap, SplitText, useGSAP } from "@/lib/gsap";

/**
 * Entrada de la portada con GSAP:
 *  1. la etiqueta pequeña aparece,
 *  2. el nombre sube letra por letra desde una ranura (máscara),
 *  3. la línea dorada se dibuja desde el centro,
 *  4. el lema, los botones y el detalle del servicio llegan en cascada.
 * Al bajar por la página, la foto se mueve un poco más lento que el contenido (profundidad).
 *
 * Mientras carga, los textos están ocultos por CSS (.portada-anim); si GSAP no llegara a correr,
 * una animación de respaldo los muestra igual (globals.css). Con movimiento reducido: todo quieto y visible.
 */
export function PortadaAnimada({ children }: { children: React.ReactNode }) {
  const raiz = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(CON_MOVIMIENTO, () => {
        const titulo = raiz.current?.querySelector<HTMLElement>("[data-anim='titulo']");
        const partido = titulo ? SplitText.create(titulo, { type: "chars", mask: "chars" }) : null;

        // Primero se quita el ocultamiento del CSS; cada .from() de abajo fija enseguida su estado inicial
        // (invisible, abajo), así nada aparece y desaparece antes de su turno.
        gsap.set("[data-anim]", { visibility: "visible" });

        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        tl.from("[data-anim='etiqueta']", { y: 14, autoAlpha: 0, duration: 0.7 })
          .from(partido?.chars ?? [], { yPercent: 110, duration: 0.9, stagger: 0.035, ease: "power4.out" }, "-=0.35")
          .from("[data-anim='linea']", { scaleX: 0, duration: 0.8, ease: "power2.inOut" }, "-=0.45")
          .from("[data-anim='resto']", { y: 18, autoAlpha: 0, duration: 0.8, stagger: 0.12 }, "-=0.5");

        // Profundidad: la foto baja un poco mientras la portada sale de la pantalla
        gsap.to("[data-anim='foto']", {
          yPercent: 12,
          ease: "none",
          scrollTrigger: { trigger: raiz.current, start: "top top", end: "bottom top", scrub: true },
        });
      });

      mm.add(SIN_MOVIMIENTO, () => {
        gsap.set("[data-anim]", { visibility: "visible" });
      });
    },
    { scope: raiz },
  );

  return (
    <div ref={raiz} className="portada-anim">
      {children}
    </div>
  );
}
