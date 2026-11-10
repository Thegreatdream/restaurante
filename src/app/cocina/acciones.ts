"use server";

import { redirect } from "next/navigation";
import { supabaseServidor } from "@/lib/supabase/server";
import { obtenerAjustes } from "@/lib/menu";
import { enviarCorreoDespacho } from "@/lib/correo";

export async function despacharPedido(id: string): Promise<{ ok: boolean; correo?: boolean; mensaje?: string }> {
  const [supabase, restaurante] = await Promise.all([supabaseServidor(), obtenerAjustes()]);

  // La seguridad (RLS) solo deja actualizar a la cocina y al administrador de ESTE restaurante.
  const { data, error } = await supabase
    .from("orders")
    .update({ status: "en_camino" })
    .eq("id", id)
    .eq("restaurant_id", restaurante.id)
    .in("status", ["recibido", "preparando"])
    .select("id, daily_number, customer_name, customer_email, address, total, payment_method, order_items(product_name, quantity)")
    .maybeSingle();

  if (error) return { ok: false, mensaje: "No se pudo marcar como despachado. Intenta de nuevo." };
  if (!data) return { ok: false, mensaje: "Este pedido ya estaba despachado." };

  const correo = await enviarCorreoDespacho(data, restaurante);
  if (correo) await supabase.from("orders").update({ email_sent_at: new Date().toISOString() }).eq("id", id);
  return { ok: true, correo };
}

/** Borra los pedidos de prueba de este restaurante (modo demostración). Solo cocina o administrador. */
export async function borrarPedidosPrueba(): Promise<{ ok: boolean; borrados?: number; mensaje?: string }> {
  const [supabase, restaurante] = await Promise.all([supabaseServidor(), obtenerAjustes()]);
  const { data, error } = await supabase.rpc("delete_demo_orders", { p_restaurant: restaurante.id });
  if (error) return { ok: false, mensaje: "No se pudieron borrar. Intenta de nuevo." };
  return { ok: true, borrados: data as number };
}

export async function cerrarSesion() {
  const supabase = await supabaseServidor();
  await supabase.auth.signOut();
  redirect("/cocina/ingresar");
}
