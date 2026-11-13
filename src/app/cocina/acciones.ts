"use server";

import { redirect } from "next/navigation";
import { supabaseServidor } from "@/lib/supabase/server";
import { obtenerAjustes } from "@/lib/menu";
import { enviarCorreoEstado } from "@/lib/correo";
import { miRol } from "@/lib/panel";
import type { EstadoPedido, TipoPedido } from "@/lib/tipos";

type Siguiente = "en_camino" | "listo_recoger" | "va_mesa" | "entregado";

/** Desde qué estados y para qué tipo de pedido se permite cada paso. */
const REGLAS: Record<Siguiente, { desde: EstadoPedido[]; tipos: TipoPedido[] }> = {
  en_camino: { desde: ["recibido", "preparando"], tipos: ["domicilio"] },
  listo_recoger: { desde: ["recibido", "preparando"], tipos: ["recoger"] },
  va_mesa: { desde: ["recibido", "preparando"], tipos: ["mesa"] },
  entregado: { desde: ["en_camino", "listo_recoger", "va_mesa"], tipos: ["domicilio", "recoger", "mesa"] },
};

const SIN_PERMISO = "Tu cuenta no tiene permiso para cambiar pedidos.";

/** Cocina o administrador: los únicos que despachan y cancelan. */
async function esCocina() {
  const rol = await miRol();
  return rol === "admin" || rol === "cocina";
}

/**
 * Cancela un pedido que no se puede atender (pedido falso, plato agotado, fuera de zona…).
 * Se puede cancelar mientras no esté entregado. El cliente lo ve de inmediato en su seguimiento.
 */
export async function cancelarPedido(id: string): Promise<{ ok: boolean; mensaje?: string }> {
  if (!(await esCocina())) return { ok: false, mensaje: "Solo la cocina o el administrador pueden cancelar pedidos." };
  const [supabase, restaurante] = await Promise.all([supabaseServidor(), obtenerAjustes()]);
  const { data, error } = await supabase
    .from("orders")
    .update({ status: "cancelado", offered_at: null })
    .eq("id", id)
    .eq("restaurant_id", restaurante.id)
    .in("status", ["por_confirmar", "recibido", "preparando", "en_camino", "listo_recoger", "va_mesa"])
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, mensaje: "No se pudo cancelar el pedido. Intenta de nuevo." };
  if (!data) return { ok: false, mensaje: "Este pedido ya cambió de estado. Se actualizó la lista." };
  return { ok: true };
}

/**
 * Avanza un pedido al siguiente estado: despachado, listo para recoger o entregado.
 * Al despachar o al quedar listo, se avisa al cliente por correo.
 */
export async function avanzarPedido(
  id: string,
  siguiente: Siguiente,
): Promise<{ ok: boolean; correo?: boolean; mensaje?: string }> {
  const regla = REGLAS[siguiente];
  if (!regla) return { ok: false, mensaje: "Acción no válida." };
  if (!(await miRol())) return { ok: false, mensaje: SIN_PERMISO };
  const [supabase, restaurante] = await Promise.all([supabaseServidor(), obtenerAjustes()]);

  // La seguridad (RLS) solo deja actualizar a la cocina y al administrador de ESTE restaurante.
  const { data, error } = await supabase
    .from("orders")
    .update({ status: siguiente })
    .eq("id", id)
    .eq("restaurant_id", restaurante.id)
    .in("status", regla.desde)
    .in("order_type", regla.tipos)
    .select(
      "id, daily_number, customer_name, customer_email, order_type, address, pickup_at, total, payment_method, order_items(product_name, quantity)",
    )
    .maybeSingle();

  if (error) return { ok: false, mensaje: "No se pudo actualizar el pedido. Intenta de nuevo." };
  if (!data) return { ok: false, mensaje: "Este pedido ya cambió de estado. Se actualizó la lista." };

  let correo = false;
  if (siguiente === "en_camino" || siguiente === "listo_recoger") {
    correo = await enviarCorreoEstado(siguiente, data, restaurante);
    if (correo) await supabase.from("orders").update({ email_sent_at: new Date().toISOString() }).eq("id", id);
  }
  return { ok: true, correo };
}

/**
 * Despacho de un domicilio con domiciliario: se le asigna a uno (sale en camino de una vez)
 * o se ofrece a todos (sigue en cocina hasta que alguien toque "Lo llevo yo").
 */
export async function despacharCon(
  id: string,
  domiciliario: string | "todos",
): Promise<{ ok: boolean; mensaje?: string }> {
  if (!(await esCocina())) return { ok: false, mensaje: SIN_PERMISO };
  const [supabase, restaurante] = await Promise.all([supabaseServidor(), obtenerAjustes()]);
  const token = crypto.randomUUID().replace(/-/g, "");
  const base = supabase.from("orders");

  if (domiciliario === "todos") {
    const { data, error } = await base
      .update({ offered_at: new Date().toISOString(), delivery_token: token })
      .eq("id", id)
      .eq("restaurant_id", restaurante.id)
      .eq("order_type", "domicilio")
      .is("courier_id", null)
      .in("status", ["recibido", "preparando"])
      .select("id")
      .maybeSingle();
    if (error) return { ok: false, mensaje: "No se pudo ofrecer el pedido." };
    if (!data) return { ok: false, mensaje: "Este pedido ya cambió. Se actualizó la lista." };
    return { ok: true };
  }

  const { data, error } = await base
    .update({ courier_id: domiciliario, assigned_at: new Date().toISOString(), status: "en_camino", delivery_token: token, offered_at: null })
    .eq("id", id)
    .eq("restaurant_id", restaurante.id)
    .eq("order_type", "domicilio")
    .is("courier_id", null)
    .in("status", ["recibido", "preparando"])
    .select(
      "id, daily_number, customer_name, customer_email, order_type, address, pickup_at, total, payment_method, order_items(product_name, quantity)",
    )
    .maybeSingle();
  if (error) return { ok: false, mensaje: "No se pudo asignar el domiciliario." };
  if (!data) return { ok: false, mensaje: "Este pedido ya lo tomó alguien o cambió de estado." };
  const correo = await enviarCorreoEstado("en_camino", data, restaurante);
  if (correo) await supabase.from("orders").update({ email_sent_at: new Date().toISOString() }).eq("id", id);
  return { ok: true };
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
