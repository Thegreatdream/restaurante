"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseServidor } from "@/lib/supabase/server";
import { obtenerAjustes } from "@/lib/menu";
import { miRol } from "@/lib/panel";

const texto = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null);

/** Quita "@", "https://instagram.com/" y similares: deja solo el usuario. */
const usuarioRed = z
  .string()
  .trim()
  .max(120)
  .transform((v) => v.replace(/^https?:\/\/(www\.)?[^/]+\//i, "").replace(/^@/, "").replace(/\/.*$/, "") || null);

const soloDigitos = (v: string) => v.replace(/\D/g, "");
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color inválido.");
const hora = z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida.");

const esquema = z.object({
  name: z.string().trim().min(2, "Escribe el nombre del restaurante.").max(60),
  tagline: texto(80),
  logo_url: z
    .string()
    .trim()
    .max(500)
    .refine((v) => !v || /^https:\/\//.test(v), "El logo debe ser un enlace que empiece por https://")
    .transform((v) => v || null),
  color_brand: color,
  color_accent: color,
  color_band: color,
  is_open: z.boolean(),
  demo_mode: z.boolean(),
  delivery_fee: z.number().int().min(0).max(100_000),
  min_order: z.number().int().min(0).max(1_000_000),
  prep_delay_minutes: z.number().int().min(0).max(60),
  mod_delivery: z.boolean(),
  mod_pickup: z.boolean(),
  mod_table: z.boolean(),
  mod_reservations: z.boolean(),
  reservation_slot_minutes: z.union([z.literal(15), z.literal(30), z.literal(45), z.literal(60), z.literal(90), z.literal(120)]),
  reservation_capacity: z.number().int().min(1).max(500),
  reservation_max_party: z.number().int().min(1).max(50),
  reservation_days_ahead: z.number().int().min(1).max(180),
  reservation_lead_minutes: z.number().int().min(0).max(2880),
  reservation_auto_confirm: z.boolean(),
  pickup_lead_minutes: z.number().int().min(5).max(180),
  transfer_info: z
    .string()
    .trim()
    .max(300, "Máximo 300 caracteres.")
    .transform((v) => v || null),
  address: texto(160),
  phone: z
    .string()
    .transform(soloDigitos)
    .refine((v) => !v || /^\d{7,10}$/.test(v), "Escribe el teléfono con 7 a 10 dígitos.")
    .transform((v) => v || null),
  whatsapp: z
    .string()
    .transform(soloDigitos)
    // Un celular colombiano de 10 dígitos recibe el indicativo 57 automáticamente
    .transform((v) => (/^3\d{9}$/.test(v) ? `57${v}` : v))
    .refine((v) => !v || /^\d{11,15}$/.test(v), "Escribe el celular de WhatsApp (10 dígitos).")
    .transform((v) => v || null),
  maps_url: z
    .string()
    .trim()
    .max(500)
    .refine((v) => !v || /^https:\/\//.test(v), "Pega el enlace completo de Google Maps (empieza por https://).")
    .transform((v) => v || null),
  instagram: usuarioRed,
  facebook: usuarioRed,
  tiktok: usuarioRed,
  legal_name: texto(120),
  legal_id: texto(30),
  privacy_email: z
    .string()
    .trim()
    .max(120)
    .refine((v) => !v || z.string().email().safeParse(v).success, "Revisa el correo.")
    .transform((v) => v || null),
  horario: z
    .array(z.object({ weekday: z.number().int().min(0).max(6), abierto: z.boolean(), opens: hora, closes: hora }))
    .length(7),
  horarioReservas: z
    .array(z.object({ weekday: z.number().int().min(0).max(6), abierto: z.boolean(), opens: hora, closes: hora }))
    .length(7),
});

export type DatosAjustes = z.input<typeof esquema>;
export type ResultadoAjustes = { ok: true } | { ok: false; mensaje: string; campos?: Record<string, string> };

export async function guardarAjustes(datos: DatosAjustes): Promise<ResultadoAjustes> {
  if ((await miRol()) !== "admin") return { ok: false, mensaje: "Solo el administrador puede cambiar los ajustes." };

  const r = esquema.safeParse(datos);
  if (!r.success) {
    const campos: Record<string, string> = {};
    for (const i of r.error.issues) campos[String(i.path[0])] ??= i.message;
    return { ok: false, mensaje: "Revisa los datos marcados.", campos };
  }
  const { horario, horarioReservas, ...resto } = r.data;
  if (!resto.mod_delivery && !resto.mod_pickup)
    return { ok: false, mensaje: "Deja activo al menos un tipo de pedido: domicilio o para recoger.", campos: { mod_delivery: "x" } };
  const malHorario = [...horario, ...horarioReservas].find((h) => h.abierto && h.closes <= h.opens);
  if (malHorario) return { ok: false, mensaje: "En el horario, la hora de cierre debe ser después de la de apertura.", campos: { horario: "x" } };

  const restaurante = await obtenerAjustes();
  const supabase = await supabaseServidor();

  // La seguridad de la base de datos solo deja editar al administrador de ESTE restaurante.
  const { error } = await supabase.from("restaurants").update(resto).eq("id", restaurante.id);
  if (error) return { ok: false, mensaje: "No se pudieron guardar los ajustes. Intenta de nuevo." };

  const { error: e1 } = await supabase.from("opening_hours").delete().eq("restaurant_id", restaurante.id);
  const tramos = horario
    .filter((h) => h.abierto)
    .map((h) => ({ restaurant_id: restaurante.id, weekday: h.weekday, opens: h.opens, closes: h.closes }));
  const { error: e2 } = tramos.length ? await supabase.from("opening_hours").insert(tramos) : { error: null };
  if (e1 || e2) return { ok: false, mensaje: "Se guardó todo menos el horario. Intenta guardar de nuevo." };

  const { error: e3 } = await supabase.from("reservation_hours").delete().eq("restaurant_id", restaurante.id);
  const tramosR = horarioReservas
    .filter((h) => h.abierto)
    .map((h) => ({ restaurant_id: restaurante.id, weekday: h.weekday, opens: h.opens, closes: h.closes }));
  const { error: e4 } = tramosR.length ? await supabase.from("reservation_hours").insert(tramosR) : { error: null };
  if (e3 || e4) return { ok: false, mensaje: "Se guardó todo menos el horario de reservas. Intenta de nuevo." };

  revalidatePath("/", "layout");
  return { ok: true };
}
