import "server-only";
import { supabaseServidor } from "@/lib/supabase/server";
import type { Ajustes, Categoria } from "@/lib/tipos";
import { MENU_DEMO, AJUSTES_DEMO } from "@/lib/menu-demo";

export const supabaseConfigurado = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

export async function obtenerAjustes(): Promise<Ajustes> {
  if (!supabaseConfigurado) return AJUSTES_DEMO;
  const supabase = await supabaseServidor();
  const { data } = await supabase
    .from("settings")
    .select("delivery_fee, min_order, prep_delay_minutes, is_open")
    .single();
  return (data as Ajustes) ?? AJUSTES_DEMO;
}

/** Menú por categorías, en orden. Sin Supabase configurado devuelve un menú de muestra. */
export async function obtenerMenu(): Promise<{ categorias: Categoria[]; ajustes: Ajustes; demo: boolean }> {
  if (!supabaseConfigurado) return { categorias: MENU_DEMO, ajustes: AJUSTES_DEMO, demo: true };

  const supabase = await supabaseServidor();
  const [{ data: categorias, error }, { data: ajustes }] = await Promise.all([
    supabase
      .from("categories")
      // products(*) trae también image_url cuando la columna existe (migración 0002), sin romper si aún no.
      .select("id, name, slug, position, products(*)")
      .eq("is_active", true)
      .eq("products.is_available", true)
      .order("position")
      .order("position", { referencedTable: "products" }),
    supabase.from("settings").select("delivery_fee, min_order, prep_delay_minutes, is_open").single(),
  ]);

  if (error) throw error;
  return {
    categorias: (categorias ?? []).filter((c) => c.products.length > 0) as Categoria[],
    ajustes: (ajustes as Ajustes) ?? AJUSTES_DEMO,
    demo: false,
  };
}
