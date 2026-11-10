"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseServidor } from "@/lib/supabase/server";
import { obtenerAjustes } from "@/lib/menu";
import { miRol } from "@/lib/panel";

type Resultado = { ok: true } | { ok: false; mensaje: string };

const etiqueta = z
  .string()
  .trim()
  .min(1, "Escribe el nombre o número de la mesa.")
  .max(20, "Máximo 20 caracteres.");

/** Agrega una mesa. El QR se genera solo, con un código único que no cambia. */
export async function crearMesa(nombre: string): Promise<Resultado> {
  if ((await miRol()) !== "admin") return { ok: false, mensaje: "Solo el administrador puede crear mesas." };
  const r = etiqueta.safeParse(nombre);
  if (!r.success) return { ok: false, mensaje: r.error.issues[0].message };
  const [supabase, rest] = await Promise.all([supabaseServidor(), obtenerAjustes()]);
  const { count } = await supabase
    .from("restaurant_tables")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", rest.id);
  const { error } = await supabase
    .from("restaurant_tables")
    .insert({ restaurant_id: rest.id, label: r.data, position: (count ?? 0) + 1 });
  if (error) return { ok: false, mensaje: error.code === "23505" ? "Ya existe una mesa con ese nombre." : "No se pudo crear la mesa." };
  revalidatePath("/cocina/mesas");
  return { ok: true };
}

/** Activa o desactiva una mesa (una mesa inactiva no acepta pedidos por su QR). */
export async function cambiarMesa(id: string, activa: boolean): Promise<Resultado> {
  if ((await miRol()) !== "admin") return { ok: false, mensaje: "Solo el administrador puede cambiar las mesas." };
  const [supabase, rest] = await Promise.all([supabaseServidor(), obtenerAjustes()]);
  const { error } = await supabase.from("restaurant_tables").update({ active: activa }).eq("id", id).eq("restaurant_id", rest.id);
  if (error) return { ok: false, mensaje: "No se pudo actualizar la mesa." };
  revalidatePath("/cocina/mesas");
  return { ok: true };
}
