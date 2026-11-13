"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/gsap";

/**
 * Desplazamiento suave con Lenis (con mouse o touchpad; en el celular se deja el desplazamiento nativo).
 * Va sincronizado con GSAP para que las animaciones al bajar (ScrollTrigger) sigan el mismo ritmo.
 * Con "reducir movimiento" activado no se usa: la página baja como siempre.
 *
 * Los enlaces internos (#menu, #platos-del-dia) también bajan suave, dejando espacio para la barra de categorías.
 * Cualquier elemento con `data-lenis-prevent` (por ejemplo el carrito que sube desde abajo) desplaza normal.
 */
export function DesplazamientoSuave() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => 1 - Math.pow(1 - t, 3),
      anchors: { offset: -72 },
      autoRaf: false,
    });

    lenis.on("scroll", ScrollTrigger.update);
    const alTick = (tiempo: number) => lenis.raf(tiempo * 1000);
    gsap.ticker.add(alTick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(alTick);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
    };
  }, []);

  return null;
}
