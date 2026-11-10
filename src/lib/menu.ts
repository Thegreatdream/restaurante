import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { supabaseServidor } from "@/lib/supabase/server";
import type { Ajustes, Categoria, EstadoApertura, FilaRestaurante, Tramo } from "@/lib/tipos";
import { MENU_DEMO, AJUSTES_DEMO } from "@/lib/menu-demo";

export const supabaseConfigurado = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

/**
 * ¿Qué restaurante se está visitando?
 * 1. El que tenga como dominio la dirección de la visita (p. ej. dondetato.com).
 * 2. Si ninguno, el de RESTAURANTE_POR_DEFECTO (o "donde-tato").
 * Así, agregar un restaurante nuevo es solo crear su fila y apuntar su dominio a Vercel.
 */
const resolverFila = cache(async (): Promise<FilaRestaurante | null> => {
  const supabase = await supabaseServidor();
  const host = ((await headers()).get("host") ?? "").split(":")[0].toLowerCase().replace(/^www\./, "");

  if (host) {
    const { data } = await supabase.from("restaurants").select("*").eq("domain", host).maybeSingle();
    if (data) return data as FilaRestaurante;
  }
  const porDefecto = process.env.RESTAURANTE_POR_DEFECTO || "donde-tato";
  const { data } = await supabase.from("restaurants").select("*").eq("slug", porDefecto).maybeSingle();
  return (data as FilaRestaurante) ?? null;
});

/**
 * El restaurante actual con su horario y si está abierto en este momento.
 * `cache` evita consultar dos veces en la misma visita.
 */
export const obtenerAjustes = cache(async (): Promise<Ajustes> => {
  if (!supabaseConfigurado) return AJUSTES_DEMO;
  const fila = await resolverFila();
  if (!fila) return AJUSTES_DEMO;

  const supabase = await supabaseServidor();
  const [{ data: horario }, { data: estado }] = await Promise.all([
    supabase
      .from("opening_hours")
      .select("weekday, opens, closes")
      .eq("restaurant_id", fila.id)
      .order("weekday")
      .order("opens"),
    supabase.rpc("opening_status", { p_restaurant: fila.id }),
  ]);
  return {
    ...fila,
    horario: (horario as Tramo[]) ?? [],
    estado: (estado as EstadoApertura) ?? { open: false, closes_at: null, next_open: null, paused: false },
  };
});

/** Menú por categorías del restaurante actual. Sin Supabase configurado devuelve un menú de muestra. */
export async function obtenerMenu(): Promise<{ categorias: Categoria[]; ajustes: Ajustes; demo: boolean }> {
  if (!supabaseConfigurado) return { categorias: MENU_DEMO, ajustes: AJUSTES_DEMO, demo: true };

  const ajustes = await obtenerAjustes();
  const supabase = await supabaseServidor();
  const { data: categorias, error } = await supabase
    .from("categories")
    .select("id, name, slug, position, products(*)")
    .eq("restaurant_id", ajustes.id)
    .eq("is_active", true)
    .eq("products.is_available", true)
    .order("position")
    .order("position", { referencedTable: "products" });

  if (error) throw error;
  return {
    categorias: (categorias ?? []).filter((c) => c.products.length > 0) as Categoria[],
    ajustes,
    demo: false,
  };
}
