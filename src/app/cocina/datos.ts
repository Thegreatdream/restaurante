import type { SupabaseClient } from "@supabase/supabase-js";
import type { PedidoCocina } from "@/lib/tipos";

const CAMPOS =
  "id, daily_number, customer_name, customer_phone, customer_email, order_type, table_label, table_session_id, address, address_notes, notes, pickup_at, payment_method, cash_change_for, status, total, created_at, dispatched_at, ready_at, delivered_at, courier_id, offered_at, delivery_token, order_items(id, product_name, quantity)";

/** Medianoche de hoy en Colombia (UTC−5, sin horario de verano). */
export function inicioDeHoyColombia(): string {
  const fecha = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
  return new Date(`${fecha}T00:00:00-05:00`).toISOString();
}

/**
 * activos: en cocina (recibido, preparando).
 * Solo cuentan los de las últimas 18 horas: un pedido olvidado de días anteriores no se queda para siempre.
 * enCurso: ya salieron de la cocina pero falta entregarlos (en camino, listo para recoger, va a la mesa).
 * entregados: entregados hoy.
 */
export type PedidosCocina = { activos: PedidoCocina[]; enCurso: PedidoCocina[]; entregados: PedidoCocina[] };

/** Pedidos del restaurante indicado (la seguridad de la base de datos además impide ver los de otros). */
export async function cargarPedidosCocina(supabase: SupabaseClient, restauranteId: string): Promise<PedidosCocina> {
  const hoy = inicioDeHoyColombia();
  const recientes = new Date(Date.now() - 18 * 3_600_000).toISOString();
  const [activos, enCurso, entregados] = await Promise.all([
    supabase
      .from("orders")
      .select(CAMPOS)
      .eq("restaurant_id", restauranteId)
      .in("status", ["recibido", "preparando"])
      .gte("created_at", recientes)
      .order("created_at", { ascending: true }),
    supabase
      .from("orders")
      .select(CAMPOS)
      .eq("restaurant_id", restauranteId)
      .in("status", ["en_camino", "listo_recoger", "va_mesa"])
      .gte("created_at", recientes)
      .order("created_at", { ascending: true }),
    supabase
      .from("orders")
      .select(CAMPOS)
      .eq("restaurant_id", restauranteId)
      .eq("status", "entregado")
      .gte("delivered_at", hoy)
      .order("delivered_at", { ascending: false }),
  ]);
  return {
    activos: (activos.data ?? []) as PedidoCocina[],
    enCurso: (enCurso.data ?? []) as PedidoCocina[],
    entregados: (entregados.data ?? []) as PedidoCocina[],
  };
}
