"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseServidor } from "@/lib/supabase/server";
import { obtenerAjustes } from "@/lib/menu";
import { miRol } from "@/lib/panel";

type Resultado = { ok: true } | { ok: false; mensaje: string };

const esquema = z.object({
  nombre: z.string().trim().min(2, "Escribe el nombre.").max(40),
  celular: z
    .string()
    .transform((v) => v.replace(/\D/g, "").replace(/^57(?=3\d{9}$)/, ""))
    .pipe(z.string().regex(/^3\d{9}$/, "Escribe un celular de 10 dígitos que empiece por 3.")),
});

/** Registra un domiciliario. Recibe un link personal único (sin contraseña). */
export async function crearDomiciliario(datos: { nombre: string; celular: string }): Promise<Resultado> {
  if ((await miRol()) !== "admin") return { ok: false, mensaje: "Solo el administrador puede registrar domiciliarios." };
  const r = esquema.safeParse(datos);
  if (!r.success) return { ok: false, mensaje: r.error.issues[0].message };
  const [supabase, rest] = await Promise.all([supabaseServidor(), obtenerAjustes()]);
  const { error } = await supabase.from("couriers").insert({ restaurant_id: rest.id, name: r.data.nombre, phone: r.data.celular });
  if (error) return { ok: false, mensaje: "No se pudo registrar." };
  revalidatePath("/cocina/domiciliarios");
  return { ok: true };
}

/** Activa o desactiva un domiciliario. Inactivo, su link deja de funcionar. */
export async function cambiarDomiciliario(id: string, activo: boolean): Promise<Resultado> {
  if ((await miRol()) !== "admin") return { ok: false, mensaje: "Solo el administrador puede cambiar domiciliarios." };
  const [supabase, rest] = await Promise.all([supabaseServidor(), obtenerAjustes()]);
  const { error } = await supabase.from("couriers").update({ active: activo }).eq("id", id).eq("restaurant_id", rest.id);
  if (error) return { ok: false, mensaje: "No se pudo actualizar." };
  revalidatePath("/cocina/domiciliarios");
  return { ok: true };
}

/** Genera un link personal nuevo (el anterior deja de servir), p. ej. si el celular se perdió. */
export async function renovarLink(id: string): Promise<Resultado> {
  if ((await miRol()) !== "admin") return { ok: false, mensaje: "Solo el administrador puede renovar links." };
  const [supabase, rest] = await Promise.all([supabaseServidor(), obtenerAjustes()]);
  const { error } = await supabase
    .from("couriers")
    .update({ token: crypto.randomUUID().replace(/-/g, "") })
    .eq("id", id)
    .eq("restaurant_id", rest.id);
  if (error) return { ok: false, mensaje: "No se pudo renovar." };
  revalidatePath("/cocina/domiciliarios");
  return { ok: true };
}
