import type { Metadata } from "next";
import { supabaseServidor } from "@/lib/supabase/server";
import { obtenerAjustes } from "@/lib/menu";
import { miRol } from "@/lib/panel";
import { EncabezadoPanel, SinAcceso } from "../encabezado-panel";
import { AdminMenu, type CategoriaAdmin } from "./admin";

export const metadata: Metadata = { title: "Menú", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Menu() {
  const [rol, ajustes] = await Promise.all([miRol(), obtenerAjustes()]);
  if (rol !== "admin") return <SinAcceso mensaje="Solo el administrador puede editar el menú." />;

  // Todas las categorías y platos, también los ocultos y agotados (aquí se administran)
  const supabase = await supabaseServidor();
  const { data } = await supabase
    .from("categories")
    .select("id, name, slug, is_active, products(id, name, description, price, badge, is_available, image_url, position)")
    .eq("restaurant_id", ajustes.id)
    .order("position")
    .order("position", { referencedTable: "products" });

  return (
    <>
      <EncabezadoPanel ajustes={ajustes} rol={rol} actual="menu" />
      <AdminMenu categorias={(data ?? []) as CategoriaAdmin[]} restauranteId={ajustes.id} />
    </>
  );
}
