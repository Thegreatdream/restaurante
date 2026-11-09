"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { escucharAgregar, type EventoAgregar } from "@/lib/carrito";

const CLAVE = "tato:globos-vistos:v1";

/**
 * Decide si Tato comenta algo. Habla poco a propósito: solo en momentos especiales,
 * para que no se vuelva ruido (cada frase sale una vez por visita).
 */
function elegirFrase(e: EventoAgregar, vistos: Set<string>): string | null {
  const candidatas: [string, boolean][] = [
    ["favorito", e.favorito && e.esNuevo],
    ["primero", e.totalPlatos === 1],
    ["tres", e.totalPlatos === 3],
    ["banquete", e.totalPlatos === 6],
  ];
  const FRASES: Record<string, string> = {
    favorito: "¡Ese es mi favorito!",
    primero: "¡Buena elección!",
    tres: "¡Eso se ve delicioso!",
    banquete: "¡Hoy hay banquete!",
  };
  const clave = candidatas.find(([k, si]) => si && !vistos.has(k))?.[0];
  if (!clave) return null;
  vistos.add(clave);
  return FRASES[clave];
}

export function GloboTato() {
  const [frase, setFrase] = useState("");
  const [visible, setVisible] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    let vistos = new Set<string>();
    try {
      vistos = new Set(JSON.parse(sessionStorage.getItem(CLAVE) ?? "[]"));
    } catch {}

    const quitar = escucharAgregar((e) => {
      const f = elegirFrase(e, vistos);
      if (!f) return;
      try {
        sessionStorage.setItem(CLAVE, JSON.stringify([...vistos]));
      } catch {}
      setFrase(f);
      setVisible(true);
      clearTimeout(temporizador.current);
      temporizador.current = setTimeout(() => setVisible(false), 2400);
    });
    return () => {
      quitar();
      clearTimeout(temporizador.current);
    };
  }, []);

  return (
    <div
      aria-live="polite"
      className="globo-tato pointer-events-none fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] left-4 z-40 flex items-end gap-2 md:right-6 md:bottom-6 md:left-auto"
      data-visible={visible}
    >
      <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-outline bg-surface-2 shadow-[2px_2px_0_var(--shadow)]">
        <Image src="/tato/cara.png" alt="" width={192} height={192} className="mt-1 size-full object-cover" />
      </span>
      <p className="relative mb-3 rounded-2xl rounded-bl-md border-2 border-outline bg-surface px-3.5 py-2 font-display text-[15px] font-bold whitespace-nowrap shadow-[2px_2px_0_var(--shadow)]">
        {frase}
      </p>
    </div>
  );
}
