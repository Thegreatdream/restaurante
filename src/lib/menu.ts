import "server-only";
import { cache } from "react";
import { supabaseServidor } from "@/lib/supabase/server";
import type { Ajustes, Categoria, EstadoApertura, Tramo } from "@/lib/tipos";
import { MENU_DEMO, AJUSTES_DEMO } from "@/lib/menu-demo";

export const supabaseConfigurado = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

/**
 * Ajustes del restaurante + horario + si está abierto en este momento.
 * `cache` evita consultar dos veces en la misma visita (la página y el aviso de demo, por ejemplo).
 */
export const obtenerAjustes = cache(async (): Promise<Ajustes> => {
  if (!supabaseConfigurado) return AJUSTES_DEMO;
  const supabase = await supabaseServidor();
  const [{ data: ajustes }, { data: horario }, { data: estado }] = await Promise.all([
    supabase.from("settings").select("*").single(),
    supabase.from("opening_hours").select("weekday, opens, closes").order("weekday").order("opens"),
    supabase.rpc("opening_status"),
  ]);
  if (!ajustes) return AJUSTES_DEMO;
  return {
    ...AJUSTES_DEMO,
    ...ajustes,
    horario: (horario as Tramo[]) ?? [],
    estado: (estado as EstadoApertura) ?? { open: ajustes.is_open, closes_at: null, next_open: null, paused: false },
  } as Ajustes;
});

/** Menú por categorías, en orden. Sin Supabase configurado devuelve un menú de muestra. */
export async function obtenerMenu(): Promise<{ categorias: Categoria[]; ajustes: Ajustes; demo: boolean }> {
  if (!supabaseConfigurado) return { categorias: MENU_DEMO, ajustes: AJUSTES_DEMO, demo: true };

  const supabase = await supabaseServidor();
  const [{ data: categorias, error }, ajustes] = await Promise.all([
    supabase
      .from("categories")
      // products(*) trae también image_url cuando la columna existe (migración 0002), sin romper si aún no.
      .select("id, name, slug, position, products(*)")
      .eq("is_active", true)
      .eq("products.is_available", true)
      .order("position")
      .order("position", { referencedTable: "products" }),
    obtenerAjustes(),
  ]);

  if (error) throw error;
  return {
    categorias: (categorias ?? []).filter((c) => c.products.length > 0) as Categoria[],
    ajustes,
    demo: false,
  };
}
