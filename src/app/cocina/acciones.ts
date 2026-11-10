"use server";

import { redirect } from "next/navigation";
import { supabaseServidor } from "@/lib/supabase/server";
import { obtenerAjustes } from "@/lib/menu";
import { enviarCorreoEstado } from "@/lib/correo";
import type { EstadoPedido, TipoPedido } from "@/lib/tipos";

type Siguiente = "en_camino" | "listo_recoger" | "entregado";

/** Desde qué estados y para qué tipo de pedido se permite cada paso. */
const REGLAS: Record<Siguiente, { desde: EstadoPedido[]; tipos: TipoPedido[] }> = {
  en_camino: { desde: ["recibido", "preparando"], tipos: ["domicilio"] },
  listo_recoger: { desde: ["recibido", "preparando"], tipos: ["recoger"] },
  entregado: { desde: ["en_camino", "listo_recoger", "va_mesa"], tipos: ["domicilio", "recoger", "mesa"] },
};

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
