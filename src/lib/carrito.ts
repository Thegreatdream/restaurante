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

/** Lo que cambió al poner el carrito al día con el menú. */
export type CambiosCarrito = { quitados: string[]; precios: string[] };

/** Aviso de "se agregó algo". */
export type EventoAgregar = { nombre: string; favorito: boolean; esNuevo: boolean; totalPlatos: number };
const oyentesAgregar = new Set<(e: EventoAgregar) => void>();
export function escucharAgregar(fn: (e: EventoAgregar) => void) {
  oyentesAgregar.add(fn);
  return () => {
    oyentesAgregar.delete(fn);
  };
}

export const carrito = {
  agregar(p: { id: string; name: string; price: number; badge?: string | null }) {
    const existe = estado.items.find((i) => i.id === p.id);
    const item = { id: p.id, name: p.name, price: p.price };
    guardar({
      items: existe
        ? estado.items.map((i) => (i.id === p.id ? { ...i, qty: Math.min(i.qty + 1, MAX_POR_PLATO) } : i))
        : [...estado.items, { ...item, qty: 1 }],
    });
    const evento: EventoAgregar = {
      nombre: p.name,
      favorito: Boolean(p.badge && /favorit/i.test(p.badge)),
      esNuevo: !existe,
      totalPlatos: estado.items.reduce((n, i) => n + i.qty, 0),
    };
    oyentesAgregar.forEach((o) => o(evento));
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
  /**
   * Pone el carrito al día con los platos disponibles hoy: quita los que ya no están
   * y actualiza nombre y precio. Devuelve qué cambió para avisarle al cliente.
   */
  sincronizar(productos: { id: string; name: string; price: number }[]): CambiosCarrito {
    cargar();
    const menu = new Map(productos.map((p) => [p.id, p]));
    const quitados: string[] = [];
    const precios: string[] = [];
    let cambio = false;
    const items = estado.items.flatMap((i) => {
      const p = menu.get(i.id);
      if (!p) {
        quitados.push(i.name);
        cambio = true;
        return [];
      }
      if (p.price !== i.price) precios.push(p.name);
      if (p.price === i.price && p.name === i.name) return [i];
      cambio = true;
      return [{ ...i, name: p.name, price: p.price }];
    });
    if (cambio) guardar({ items });
    return { quitados, precios };
  },
};

const nada = () => () => {};
/** false en el servidor y en el primer pintado; true cuando ya se leyó el carrito guardado. */
export function useHidratado() {
  return useSyncExternalStore(nada, () => true, () => false);
}

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
