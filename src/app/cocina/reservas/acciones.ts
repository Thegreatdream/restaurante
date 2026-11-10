"use server";

import { supabaseServidor } from "@/lib/supabase/server";
import { obtenerAjustes } from "@/lib/menu";
import { miRol } from "@/lib/panel";
import type { EstadoReserva } from "@/lib/tipos";

const ESTADOS: EstadoReserva[] = ["pendiente", "confirmada", "cancelada", "llego", "no_llego"];

/** Cambia el estado de una reserva (confirmar, llegó, no llegó, cancelar). Meseros o administrador. */
export async function cambiarEstadoReserva(id: string, estado: EstadoReserva): Promise<{ ok: boolean; mensaje?: string }> {
  const rol = await miRol();
  if (rol !== "admin" && rol !== "mesero") return { ok: false, mensaje: "No tienes permiso para cambiar reservas." };
  if (!ESTADOS.includes(estado)) return { ok: false, mensaje: "Estado no válido." };
  const [supabase, r] = await Promise.all([supabaseServidor(), obtenerAjustes()]);
  const { error } = await supabase
    .from("reservations")
    .update({ status: estado, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("restaurant_id", r.id);
  return error ? { ok: false, mensaje: "No se pudo actualizar la reserva." } : { ok: true };
}
