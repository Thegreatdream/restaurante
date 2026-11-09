"use client";

import { useSyncExternalStore } from "react";

/**
 * Carrito guardado en el celular del cliente (localStorage).
 * El precio aquí es SOLO para mostrar: el total real lo calcula el servidor.
 */
export type ItemCarrito = { id: string; name: string; price: number; qty: number };
type Estado = { items: ItemCarrito[] };

const CLAVE = "tato:carrito:v1";
const VACIO: Estado = { items: [] };
const MAX_POR_PLATO = 20;

let estado: Estado = VACIO;
let cargado = false;
const oyentes = new Set<() => void>();

function cargar() {
  if (cargado || typeof window === "undefined") return;
  cargado = true;
  try {
    const crudo = window.localStorage.getItem(CLAVE);
    if (crudo) {
      const datos = JSON.parse(crudo) as Estado;
      if (Array.isArray(datos.items)) estado = { items: datos.items.filter((i) => i.qty > 0) };
    }
  } catch {
    // Modo incógnito o almacenamiento bloqueado: el carrito vive solo en memoria.
  }
}

function guardar(siguiente: Estado) {
  estado = siguiente;
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify(estado));
  } catch {}
  oyentes.forEach((o) => o());
}

function suscribir(o: () => void) {
  cargar();
  oyentes.add(o);
  const alCambiarPestana = (e: StorageEvent) => {
    if (e.key === CLAVE) {
      cargado = false;
      estado = VACIO;
      cargar();
      o();
    }
  };
  window.addEventListener("storage", alCambiarPestana);
  return () => {
    oyentes.delete(o);
    window.removeEventListener("storage", alCambiarPestana);
  };
}

export const carrito = {
  agregar(p: { id: string; name: string; price: number }) {
    const existe = estado.items.find((i) => i.id === p.id);
    guardar({
      items: existe
        ? estado.items.map((i) => (i.id === p.id ? { ...i, qty: Math.min(i.qty + 1, MAX_POR_PLATO) } : i))
        : [...estado.items, { ...p, qty: 1 }],
    });
  },
  quitar(id: string) {
    guardar({
      items: estado.items
        .map((i) => (i.id === id ? { ...i, qty: i.qty - 1 } : i))
        .filter((i) => i.qty > 0),
    });
  },
  eliminar(id: string) {
    guardar({ items: estado.items.filter((i) => i.id !== id) });
  },
  vaciar() {
    guardar(VACIO);
  },
};

export function useCarrito() {
  const s = useSyncExternalStore(
    suscribir,
    () => {
      cargar();
      return estado;
    },
    () => VACIO,
  );
  const cantidad = s.items.reduce((n, i) => n + i.qty, 0);
  const subtotal = s.items.reduce((n, i) => n + i.qty * i.price, 0);
  return { items: s.items, cantidad, subtotal };
}
