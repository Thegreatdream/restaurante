"use server";

import { z } from "zod";
import { supabaseServidor } from "@/lib/supabase/server";
import { obtenerAjustes, supabaseConfigurado } from "@/lib/menu";
import { huellaOrigen } from "@/lib/origen";

const esquema = z
  .object({
    tipo: z.enum(["domicilio", "recoger"], { message: "Elige cómo quieres tu pedido." }),
    nombre: z.string().trim().min(2, "Escribe tu nombre.").max(80, "El nombre es muy largo."),
    celular: z
      .string()
      .transform((v) => v.replace(/\D/g, ""))
      .pipe(z.string().regex(/^3\d{9}$/, "Escribe un celular de 10 dígitos que empiece por 3.")),
    // Opcional: sin correo no se envían avisos, pero el pedido se recibe igual.
    correo: z
      .string()
      .trim()
      .toLowerCase()
      .max(120)
      .refine((v) => !v || z.string().email().safeParse(v).success, "Revisa el correo, parece incompleto.")
      .optional()
      .default(""),
    direccion: z.string().trim().max(200).optional().default(""),
    horaRecogida: z.string().optional().default(""),
    indicaciones: z.string().trim().max(300, "Máximo 300 caracteres.").optional().default(""),
    notas: z.string().trim().max(300, "Máximo 300 caracteres.").optional().default(""),
    pago: z.enum(["efectivo", "transferencia"], { message: "Elige cómo vas a pagar." }),
    pagaCon: z
      .string()
      .optional()
      .transform((v) => (v ? Number(v.replace(/\D/g, "")) || null : null)),
    items: z
      .array(z.object({ product_id: z.string().uuid(), quantity: z.number().int().min(1).max(20) }))
      .min(1, "Tu carrito está vacío.")
      .max(40),
    autorizo: z.literal(true, { message: "Para enviar el pedido necesitamos tu autorización de datos." }),
  })
  .strict()
  // Domicilio necesita dirección; para recoger, una hora.
  .superRefine((d, ctx) => {
    if (d.tipo === "domicilio" && d.direccion.length < 5)
      ctx.addIssue({ code: "custom", path: ["direccion"], message: "Escribe la dirección completa." });
    if (d.tipo === "recoger" && !d.horaRecogida)
      ctx.addIssue({ code: "custom", path: ["horaRecogida"], message: "Elige a qué hora pasas a recoger." });
  });

export type DatosPedido = z.input<typeof esquema>;
export type ResultadoPedido =
  | { ok: true; id: string }
  | { ok: false; mensaje: string; campos?: Partial<Record<keyof DatosPedido, string>> };

const ERRORES_BD: Record<string, string> = {
  CERRADO: "En este momento estamos cerrados. Revisa el horario e intenta más tarde.",
  SIN_AUTORIZACION: "Para enviar el pedido necesitamos tu autorización de datos.",
  MODULO_INACTIVO: "Este restaurante no está recibiendo este tipo de pedido por ahora.",
  SIN_DIRECCION: "Escribe la dirección completa.",
  SIN_HORA: "Elige a qué hora pasas a recoger.",
  HORA_INVALIDA: "Esa hora ya no está disponible. Elige otra hora para recoger.",
  CARRITO_VACIO: "Tu carrito está vacío.",
  PRODUCTO_NO_DISPONIBLE: "Uno de los platos ya no está disponible. Vuelve al menú y revisa tu pedido.",
  PEDIDO_MINIMO: "Tu pedido no alcanza el mínimo.",
  DEMASIADOS_ITEMS: "Son demasiados platos para un solo pedido.",
  DEMASIADOS_PEDIDOS: "Ya recibimos varios pedidos tuyos hace poco. Espera unos minutos o escríbenos para ayudarte.",
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

  // El restaurante se decide en el servidor (por la dirección visitada), nunca lo manda el navegador.
  const restaurante = await obtenerAjustes();
  const supabase = await supabaseServidor();
  const { data: id, error } = await supabase.rpc("create_order", {
    p_restaurant: restaurante.id,
    p_type: d.tipo,
    p_name: d.nombre,
    p_phone: d.celular,
    p_email: d.correo || null,
    p_address: d.direccion,
    p_address_notes: d.indicaciones,
    p_payment_method: d.pago,
    p_cash_change_for: d.pago === "efectivo" ? d.pagaCon : null,
    p_items: items,
    p_consent: d.autorizo,
    p_pickup_at: d.tipo === "recoger" ? d.horaRecogida : null,
    p_notes: d.notas || null,
    p_origin: await huellaOrigen(restaurante.id),
  });

  if (error || !id) {
    const codigo = Object.keys(ERRORES_BD).find((k) => error?.message.includes(k));
    console.error("crear pedido:", error);
    return { ok: false, mensaje: codigo ? ERRORES_BD[codigo] : "No pudimos enviar tu pedido. Intenta de nuevo." };
  }
  return { ok: true, id: id as string };
}
