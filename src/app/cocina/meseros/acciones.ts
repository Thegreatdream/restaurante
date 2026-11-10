"use server";

import { z } from "zod";
import { supabaseServidor } from "@/lib/supabase/server";
import { obtenerAjustes } from "@/lib/menu";
import { miRol } from "@/lib/panel";

type Resultado = { ok: true; total?: number; id?: string } | { ok: false; mensaje: string };

async function soloMeseros(): Promise<string | null> {
  const rol = await miRol();
  return rol === "admin" || rol === "mesero" ? null : "Solo meseros o el administrador pueden hacer esto.";
}

/** Marca un aviso ("llamar al mesero" / "pedir la cuenta") como atendido. */
export async function atenderAviso(id: string): Promise<Resultado> {
  const no = await soloMeseros();
  if (no) return { ok: false, mensaje: no };
  const [supabase, r] = await Promise.all([supabaseServidor(), obtenerAjustes()]);
  const { error } = await supabase
    .from("service_calls")
    .update({ status: "atendido", attended_at: new Date().toISOString() })
    .eq("id", id)
    .eq("restaurant_id", r.id);
  return error ? { ok: false, mensaje: "No se pudo marcar el aviso." } : { ok: true };
}

/** El mesero confirma que la mesa está ocupada: los pedidos pendientes pasan a la cocina. */
export async function confirmarMesa(sesion: string): Promise<Resultado> {
  const no = await soloMeseros();
  if (no) return { ok: false, mensaje: no };
  const supabase = await supabaseServidor();
  const { error } = await supabase.rpc("confirm_table_session", { p_session: sesion });
  return error ? { ok: false, mensaje: "No se pudo confirmar la mesa." } : { ok: true };
}

/** Cierra la cuenta al cobrar. Devuelve el total. El código de la mesa se renueva. */
export async function cerrarCuenta(sesion: string): Promise<Resultado> {
  const no = await soloMeseros();
  if (no) return { ok: false, mensaje: no };
  const supabase = await supabaseServidor();
  const { data, error } = await supabase.rpc("close_table_session", { p_session: sesion });
  return error ? { ok: false, mensaje: "No se pudo cerrar la cuenta." } : { ok: true, total: data as number };
}

const esquemaManual = z.object({
  mesa: z.string().uuid(),
  nombre: z.string().trim().max(40).optional().default(""),
  items: z
    .array(z.object({ product_id: z.string().uuid(), quantity: z.number().int().min(1).max(20) }))
    .min(1, "Agrega al menos un plato.")
    .max(40),
});

/** Pedido creado por el mesero para quien no quiere usar el celular. */
export async function pedidoManual(datos: z.input<typeof esquemaManual>): Promise<Resultado> {
  const no = await soloMeseros();
  if (no) return { ok: false, mensaje: no };
  const r = esquemaManual.safeParse(datos);
  if (!r.success) return { ok: false, mensaje: r.error.issues[0]?.message ?? "Revisa el pedido." };
  const supabase = await supabaseServidor();
  const { data, error } = await supabase.rpc("staff_table_order", {
    p_table: r.data.mesa,
    p_items: r.data.items,
    p_name: r.data.nombre || null,
  });
  if (error) {
    console.error("pedido manual:", error);
    return { ok: false, mensaje: error.message.includes("PRODUCTO_NO_DISPONIBLE") ? "Un plato ya no está disponible." : "No se pudo crear el pedido." };
  }
  return { ok: true, id: data as string };
}
