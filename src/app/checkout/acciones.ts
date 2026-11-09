"use server";

import { z } from "zod";
import { supabaseServidor } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/menu";

const esquema = z
  .object({
    nombre: z.string().trim().min(2, "Escribe tu nombre.").max(80, "El nombre es muy largo."),
    celular: z
      .string()
      .transform((v) => v.replace(/\D/g, ""))
      .pipe(z.string().regex(/^3\d{9}$/, "Escribe un celular de 10 dígitos que empiece por 3.")),
    correo: z.string().trim().toLowerCase().email("Revisa el correo, parece incompleto.").max(120),
    direccion: z.string().trim().min(5, "Escribe la dirección completa.").max(200),
    indicaciones: z.string().trim().max(300, "Máximo 300 caracteres.").optional().default(""),
    pago: z.enum(["efectivo", "transferencia"], { message: "Elige cómo vas a pagar." }),
    pagaCon: z
      .string()
      .optional()
      .transform((v) => (v ? Number(v.replace(/\D/g, "")) || null : null)),
    items: z
      .array(z.object({ product_id: z.string().uuid(), quantity: z.number().int().min(1).max(20) }))
      .min(1, "Tu carrito está vacío.")
      .max(40),
  })
  .strict();

export type DatosPedido = z.input<typeof esquema>;
export type ResultadoPedido =
  | { ok: true; id: string }
  | { ok: false; mensaje: string; campos?: Partial<Record<keyof DatosPedido, string>> };

const ERRORES_BD: Record<string, string> = {
  CERRADO: "En este momento estamos cerrados. Intenta más tarde.",
  CARRITO_VACIO: "Tu carrito está vacío.",
  PRODUCTO_NO_DISPONIBLE: "Uno de los platos ya no está disponible. Vuelve al menú y revisa tu pedido.",
  PEDIDO_MINIMO: "Tu pedido no alcanza el mínimo.",
  DEMASIADOS_ITEMS: "Son demasiados platos para un solo pedido.",
};

export async function crearPedido(datos: DatosPedido): Promise<ResultadoPedido> {
  const r = esquema.safeParse(datos);
  if (!r.success) {
    const campos: Record<string, string> = {};
    for (const issue of r.error.issues) {
      const k = String(issue.path[0]);
      campos[k] ??= issue.message;
    }
    if (!supabaseConfigurado && Object.keys(campos).every((k) => k === "items")) {
      return { ok: false, mensaje: "Menú de muestra: conecta Supabase para recibir pedidos de verdad." };
    }
    return { ok: false, mensaje: "Revisa los datos marcados.", campos };
  }

  if (!supabaseConfigurado) {
    return { ok: false, mensaje: "Menú de muestra: conecta Supabase para recibir pedidos de verdad." };
  }

  const d = r.data;
  // Si el mismo plato llega dos veces, se suman las cantidades.
  const items = Object.values(
    d.items.reduce<Record<string, { product_id: string; quantity: number }>>((acc, i) => {
      acc[i.product_id] = { product_id: i.product_id, quantity: (acc[i.product_id]?.quantity ?? 0) + i.quantity };
      return acc;
    }, {}),
  );

  const supabase = await supabaseServidor();
  const { data: id, error } = await supabase.rpc("create_order", {
    p_name: d.nombre,
    p_phone: d.celular,
    p_email: d.correo,
    p_address: d.direccion,
    p_address_notes: d.indicaciones,
    p_payment_method: d.pago,
    p_cash_change_for: d.pago === "efectivo" ? d.pagaCon : null,
    p_items: items,
  });

  if (error || !id) {
    const codigo = Object.keys(ERRORES_BD).find((k) => error?.message.includes(k));
    console.error("crear pedido:", error);
    return { ok: false, mensaje: codigo ? ERRORES_BD[codigo] : "No pudimos enviar tu pedido. Intenta de nuevo." };
  }
  return { ok: true, id: id as string };
}
