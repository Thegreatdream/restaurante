"use server";

import { supabaseServidor } from "@/lib/supabase/server";
import { obtenerAjustes } from "@/lib/menu";
import { enviarCorreoEstado } from "@/lib/correo";

/** "Lo llevo yo": el primero que toca se queda con el pedido. Avisa al cliente por correo. */
export async function tomarPedido(
  tokenDomiciliario: string,
  pedido: string,
): Promise<{ ok: true; entrega: string } | { ok: false; mensaje: string }> {
  const [supabase, restaurante] = await Promise.all([supabaseServidor(), obtenerAjustes()]);
  const { data, error } = await supabase.rpc("claim_delivery", { p_token: tokenDomiciliario, p_order: pedido });
  if (error || !data) {
    return {
      ok: false,
      mensaje: error?.message.includes("YA_TOMADO") ? "Otro domiciliario ya lo tomó." : "No se pudo tomar el pedido. Intenta de nuevo.",
    };
  }
  const p = data as Parameters<typeof enviarCorreoEstado>[1] & { delivery_token: string };
  if (p.customer_email) await enviarCorreoEstado("en_camino", p, restaurante);
  return { ok: true, entrega: p.delivery_token };
}

/** "Marcar como entregado" desde el link privado de la entrega. */
export async function marcarEntregado(tokenEntrega: string): Promise<{ ok: boolean; mensaje?: string }> {
  const supabase = await supabaseServidor();
  const { error } = await supabase.rpc("complete_delivery", { p_token: tokenEntrega });
  if (error) return { ok: false, mensaje: error.message.includes("NO_EN_CAMINO") ? "Este pedido ya estaba entregado." : "No se pudo marcar. Intenta de nuevo." };
  return { ok: true };
}
