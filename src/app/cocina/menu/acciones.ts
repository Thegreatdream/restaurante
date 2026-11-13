"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseServidor } from "@/lib/supabase/server";
import { obtenerAjustes } from "@/lib/menu";
import { miRol } from "@/lib/panel";

type Resultado = { ok: true } | { ok: false; mensaje: string };

const BUCKET = "platos";
const NO_ADMIN: Resultado = { ok: false, mensaje: "Solo el administrador puede editar el menú." };

/** Refresca el panel y la página de pedidos para que el cambio se vea de inmediato. */
function refrescar() {
  revalidatePath("/cocina/menu");
  revalidatePath("/");
}

async function contexto() {
  if ((await miRol()) !== "admin") return null;
  const [supabase, rest] = await Promise.all([supabaseServidor(), obtenerAjustes()]);
  return { supabase, rest };
}

/** Ruta interna de la foto dentro del espacio "platos", si la dirección es una foto de este restaurante. */
function rutaDeFoto(url: string | null | undefined, restauranteId: string): string | null {
  if (!url) return null;
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;
  if (!url.startsWith(base)) return null;
  const ruta = decodeURIComponent(url.slice(base.length).split("?")[0]!);
  return ruta.startsWith(`${restauranteId}/`) ? ruta : null;
}

const plato = z.object({
  id: z.string().uuid().optional(),
  category_id: z.string().uuid("Elige una categoría."),
  name: z.string().trim().min(2, "Escribe el nombre del plato.").max(80, "El nombre es muy largo (máximo 80)."),
  description: z
    .string()
    .trim()
    .max(240, "La descripción es muy larga (máximo 240).")
    .transform((v) => v || null),
  price: z.coerce
    .number({ message: "Escribe el precio." })
    .int("El precio va sin centavos.")
    .min(500, "El precio debe ser de al menos $ 500.")
    .max(2_000_000, "Revisa el precio."),
  badge: z
    .string()
    .trim()
    .max(30, "La etiqueta es muy larga (máximo 30).")
    .transform((v) => v || null),
});

export type DatosPlato = z.input<typeof plato>;

/** Crea un plato nuevo (queda de último en su categoría) o guarda los cambios de uno existente. */
export async function guardarPlato(datos: DatosPlato): Promise<Resultado> {
  const c = await contexto();
  if (!c) return NO_ADMIN;
  const r = plato.safeParse(datos);
  if (!r.success) return { ok: false, mensaje: r.error.issues[0]!.message };
  const { id, ...campos } = r.data;

  // La categoría tiene que ser de este restaurante
  const { data: cat } = await c.supabase
    .from("categories")
    .select("id")
    .eq("id", campos.category_id)
    .eq("restaurant_id", c.rest.id)
    .maybeSingle();
  if (!cat) return { ok: false, mensaje: "Esa categoría no existe." };

  if (id) {
    const { error } = await c.supabase.from("products").update(campos).eq("id", id).eq("restaurant_id", c.rest.id);
    if (error) return { ok: false, mensaje: "No se pudo guardar el plato." };
  } else {
    const { data: ultimo } = await c.supabase
      .from("products")
      .select("position")
      .eq("category_id", campos.category_id)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { error } = await c.supabase
      .from("products")
      .insert({ ...campos, restaurant_id: c.rest.id, position: (ultimo?.position ?? 0) + 1 });
    if (error) return { ok: false, mensaje: "No se pudo agregar el plato." };
  }
  refrescar();
  return { ok: true };
}

/** Disponible o agotado: un plato agotado no se muestra ni se puede pedir, pero no se borra. */
export async function cambiarDisponible(id: string, disponible: boolean): Promise<Resultado> {
  const c = await contexto();
  if (!c) return NO_ADMIN;
  const { error } = await c.supabase
    .from("products")
    .update({ is_available: disponible })
    .eq("id", id)
    .eq("restaurant_id", c.rest.id);
  if (error) return { ok: false, mensaje: "No se pudo cambiar el plato." };
  refrescar();
  return { ok: true };
}

/** Borra el plato y su foto. Los pedidos viejos conservan el nombre y el precio que tenían. */
export async function borrarPlato(id: string): Promise<Resultado> {
  const c = await contexto();
  if (!c) return NO_ADMIN;
  const { data: p } = await c.supabase
    .from("products")
    .select("image_url")
    .eq("id", id)
    .eq("restaurant_id", c.rest.id)
    .maybeSingle();
  const { error } = await c.supabase.from("products").delete().eq("id", id).eq("restaurant_id", c.rest.id);
  if (error) return { ok: false, mensaje: "No se pudo borrar el plato." };
  const ruta = rutaDeFoto(p?.image_url, c.rest.id);
  if (ruta) await c.supabase.storage.from(BUCKET).remove([ruta]);
  refrescar();
  return { ok: true };
}

/**
 * Guarda la foto que el navegador ya subió (o null para quitarla) y borra la foto anterior.
 * Solo acepta fotos guardadas en la carpeta de este restaurante.
 */
export async function guardarFoto(id: string, url: string | null): Promise<Resultado> {
  const c = await contexto();
  if (!c) return NO_ADMIN;
  if (url && !rutaDeFoto(url, c.rest.id)) return { ok: false, mensaje: "La foto no se subió bien. Intenta de nuevo." };
  const { data: p } = await c.supabase
    .from("products")
    .select("image_url")
    .eq("id", id)
    .eq("restaurant_id", c.rest.id)
    .maybeSingle();
  if (!p) return { ok: false, mensaje: "Ese plato ya no existe." };
  const { error } = await c.supabase.from("products").update({ image_url: url }).eq("id", id).eq("restaurant_id", c.rest.id);
  if (error) return { ok: false, mensaje: "No se pudo guardar la foto." };
  const anterior = rutaDeFoto(p.image_url, c.rest.id);
  if (anterior && p.image_url !== url) await c.supabase.storage.from(BUCKET).remove([anterior]);
  refrescar();
  return { ok: true };
}

const nombreCategoria = z.string().trim().min(2, "Escribe el nombre de la categoría.").max(40, "Máximo 40 caracteres.");

/** "Platos del día" → "platos-del-dia" (para el enlace de cada sección del menú). */
function aSlug(texto: string) {
  return (
    texto
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "categoria"
  );
}

/** Agrega una categoría al final del menú. */
export async function crearCategoria(nombre: string): Promise<Resultado> {
  const c = await contexto();
  if (!c) return NO_ADMIN;
  const r = nombreCategoria.safeParse(nombre);
  if (!r.success) return { ok: false, mensaje: r.error.issues[0]!.message };

  const { data: existentes } = await c.supabase.from("categories").select("slug, position").eq("restaurant_id", c.rest.id);
  const usados = new Set((existentes ?? []).map((e) => e.slug));
  const base = aSlug(r.data);
  let slug = base;
  for (let n = 2; usados.has(slug); n++) slug = `${base}-${n}`;
  const posicion = Math.max(0, ...(existentes ?? []).map((e) => e.position)) + 1;

  const { error } = await c.supabase
    .from("categories")
    .insert({ restaurant_id: c.rest.id, name: r.data, slug, position: posicion });
  if (error) return { ok: false, mensaje: "No se pudo crear la categoría." };
  refrescar();
  return { ok: true };
}

/** Cambia el nombre de una categoría (su enlace interno no cambia). */
export async function renombrarCategoria(id: string, nombre: string): Promise<Resultado> {
  const c = await contexto();
  if (!c) return NO_ADMIN;
  const r = nombreCategoria.safeParse(nombre);
  if (!r.success) return { ok: false, mensaje: r.error.issues[0]!.message };
  const { error } = await c.supabase.from("categories").update({ name: r.data }).eq("id", id).eq("restaurant_id", c.rest.id);
  if (error) return { ok: false, mensaje: "No se pudo cambiar el nombre." };
  refrescar();
  return { ok: true };
}

/** Muestra u oculta una categoría completa en la página de pedidos. */
export async function cambiarCategoriaVisible(id: string, visible: boolean): Promise<Resultado> {
  const c = await contexto();
  if (!c) return NO_ADMIN;
  const { error } = await c.supabase.from("categories").update({ is_active: visible }).eq("id", id).eq("restaurant_id", c.rest.id);
  if (error) return { ok: false, mensaje: "No se pudo cambiar la categoría." };
  refrescar();
  return { ok: true };
}
