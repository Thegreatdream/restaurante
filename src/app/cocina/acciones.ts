"use server";

import { redirect } from "next/navigation";
import { supabaseServidor } from "@/lib/supabase/server";
import { enviarCorreoDespacho } from "@/lib/correo";

export async function despacharPedido(id: string): Promise<{ ok: boolean; correo?: boolean; mensaje?: string }> {
  const supabase = await supabaseServidor();

  // La seguridad (RLS) solo deja actualizar al personal; nadie más puede despachar.
  const { data, error } = await supabase
    .from("orders")
    .update({ status: "en_camino" })
    .eq("id", id)
    .in("status", ["recibido", "preparando"])
    .select("id, daily_number, customer_name, customer_email, address, total, payment_method, order_items(product_name, quantity)")
    .maybeSingle();

  if (error) return { ok: false, mensaje: "No se pudo marcar como despachado. Intenta de nuevo." };
  if (!data) return { ok: false, mensaje: "Este pedido ya estaba despachado." };

  const correo = await enviarCorreoDespacho(data);
  if (correo) await supabase.from("orders").update({ email_sent_at: new Date().toISOString() }).eq("id", id);
  return { ok: true, correo };
}

/** Borra todos los pedidos marcados como de prueba (modo demostración). Solo personal. */
export async function borrarPedidosPrueba(): Promise<{ ok: boolean; borrados?: number; mensaje?: string }> {
  const supabase = await supabaseServidor();
  const { data, error } = await supabase.rpc("delete_demo_orders");
  if (error) return { ok: false, mensaje: "No se pudieron borrar. Intenta de nuevo." };
  return { ok: true, borrados: data as number };
}

export async function cerrarSesion() {
  const supabase = await supabaseServidor();
  await supabase.auth.signOut();
  redirect("/cocina/ingresar");
}
