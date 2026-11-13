"use server";

import { z } from "zod";
import { supabaseServidor } from "@/lib/supabase/server";
import { obtenerAjustes } from "@/lib/menu";
import { enviarCorreoReserva } from "@/lib/correo";
import { urlPublica } from "@/lib/sitio";
import { huellaOrigen } from "@/lib/origen";

const esquema = z.object({
  inicio: z.string().datetime({ offset: true, message: "Elige una hora." }),
  personas: z.number().int().min(1).max(50),
  nombre: z.string().trim().min(2, "Escribe tu nombre.").max(80),
  celular: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .pipe(z.string().regex(/^3\d{9}$/, "Escribe un celular de 10 dígitos que empiece por 3.")),
  correo: z.string().trim().toLowerCase().email("Revisa el correo, parece incompleto.").max(120),
  nota: z.string().trim().max(300, "Máximo 300 caracteres.").optional().default(""),
  autorizo: z.literal(true, { message: "Para reservar necesitamos tu autorización de datos." }),
});

export type DatosReserva = z.input<typeof esquema>;

const ERRORES: Record<string, string> = {
  SIN_CUPO: "Esa hora se acaba de llenar. Elige otra.",
  FRANJA_INVALIDA: "Esa hora ya no está disponible. Elige otra.",
  PERSONAS_INVALIDAS: "Revisa el número de personas.",
  MODULO_INACTIVO: "Las reservas no están disponibles en este momento.",
  SIN_AUTORIZACION: "Para reservar necesitamos tu autorización de datos.",
  DEMASIADAS_RESERVAS: "Ya tienes reservas pendientes con este celular. Cancela una desde el enlace de tu correo o escríbenos.",
};

export async function crearReserva(
  datos: DatosReserva,
): Promise<{ ok: true; token: string } | { ok: false; mensaje: string; campos?: Record<string, string> }> {
  const r = esquema.safeParse(datos);
  if (!r.success) {
    const campos: Record<string, string> = {};
    for (const i of r.error.issues) campos[String(i.path[0])] ??= i.message;
    return { ok: false, mensaje: "Revisa los datos marcados.", campos };
  }
  const d = r.data;
  const [restaurante, supabase] = await Promise.all([obtenerAjustes(), supabaseServidor()]);
  const { data, error } = await supabase.rpc("create_reservation", {
    p_restaurant: restaurante.id,
    p_start: d.inicio,
    p_party: d.personas,
    p_name: d.nombre,
    p_phone: d.celular,
    p_email: d.correo,
    p_note: d.nota,
    p_consent: d.autorizo,
    p_origin: await huellaOrigen(restaurante.id),
  });
  if (error || !data) {
    const codigo = Object.keys(ERRORES).find((k) => error?.message.includes(k));
    console.error("reserva:", error);
    return { ok: false, mensaje: codigo ? ERRORES[codigo] : "No pudimos guardar tu reserva. Intenta de nuevo." };
  }
  const reserva = data as { cancel_token: string; status: "pendiente" | "confirmada"; slot_start: string; party_size: number; name: string; email: string };
  const base = await urlPublica(restaurante);
  await enviarCorreoReserva(reserva, restaurante, `${base}/reserva/${reserva.cancel_token}`);
  return { ok: true, token: reserva.cancel_token };
}

/** Cancelar desde el link del correo. */
export async function cancelarReserva(token: string): Promise<{ ok: boolean; mensaje?: string }> {
  const supabase = await supabaseServidor();
  const { error } = await supabase.rpc("cancel_reservation", { p_token: token });
  if (error) return { ok: false, mensaje: "Esta reserva ya no se puede cancelar." };
  return { ok: true };
}
