"use server";

import { z } from "zod";
import { supabaseServidor } from "@/lib/supabase/server";
import { obtenerAjustes } from "@/lib/menu";

const esquema = z.object({
  sesion: z.string().uuid(),
  codigo: z.string().min(10).max(64),
  nombre: z.string().trim().min(2, "Escribe tu nombre para saber de quién es cada plato.").max(40),
  autorizo: z.literal(true, { message: "Para enviar el pedido necesitamos tu autorización de datos." }),
  items: z
    .array(z.object({ product_id: z.string().uuid(), quantity: z.number().int().min(1).max(20) }))
    .min(1, "Tu pedido está vacío.")
    .max(40),
});

export type DatosPedidoMesa = z.input<typeof esquema>;

const ERRORES: Record<string, string> = {
  CERRADO: "En este momento estamos cerrados.",
  CUENTA_CERRADA: "Esta cuenta ya se cerró. Escanea de nuevo el QR de la mesa para pedir.",
  MODULO_INACTIVO: "El pedido en mesa no está disponible en este momento.",
  PRODUCTO_NO_DISPONIBLE: "Uno de los platos ya no está disponible. Revisa tu pedido.",
  SIN_AUTORIZACION: "Para enviar el pedido necesitamos tu autorización de datos.",
};

/** Pedido desde la mesa: se suma a la cuenta abierta de esa mesa. */
export async function crearPedidoMesa(
  datos: DatosPedidoMesa,
): Promise<{ ok: true; id: string } | { ok: false; mensaje: string; campos?: Record<string, string> }> {
  const r = esquema.safeParse(datos);
  if (!r.success) {
    const campos: Record<string, string> = {};
    for (const i of r.error.issues) campos[String(i.path[0])] ??= i.message;
    return { ok: false, mensaje: Object.values(campos)[0] ?? "Revisa los datos.", campos };
  }
  const d = r.data;
  const items = Object.values(
    d.items.reduce<Record<string, { product_id: string; quantity: number }>>((acc, i) => {
      acc[i.product_id] = { product_id: i.product_id, quantity: (acc[i.product_id]?.quantity ?? 0) + i.quantity };
      return acc;
    }, {}),
  );

  const [restaurante, supabase] = await Promise.all([obtenerAjustes(), supabaseServidor()]);
  const { data: id, error } = await supabase.rpc("create_order", {
    p_restaurant: restaurante.id,
    p_type: "mesa",
    p_name: d.nombre,
    p_phone: null,
    p_email: null,
    p_address: null,
    p_address_notes: null,
    p_payment_method: null,
    p_cash_change_for: null,
    p_items: items,
    p_consent: d.autorizo,
    p_table_session: d.sesion,
    p_access_code: d.codigo,
  });
  if (error || !id) {
    const codigo = Object.keys(ERRORES).find((k) => error?.message.includes(k));
    console.error("pedido mesa:", error);
    return { ok: false, mensaje: codigo ? ERRORES[codigo] : "No pudimos enviar tu pedido. Intenta de nuevo." };
  }
  return { ok: true, id: id as string };
}
