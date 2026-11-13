"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

// Los plugins se registran una sola vez y solo en el navegador (GSAP no corre en el servidor).
if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);
}

/** Movimiento completo solo para quien no pidió reducir animaciones en su celular o computador. */
export const CON_MOVIMIENTO = "(prefers-reduced-motion: no-preference)";
export const SIN_MOVIMIENTO = "(prefers-reduced-motion: reduce)";

export { gsap, ScrollTrigger, SplitText, useGSAP };
