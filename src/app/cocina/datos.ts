import type { SupabaseClient } from "@supabase/supabase-js";
import type { PedidoCocina } from "@/lib/tipos";

const CAMPOS =
  "id, daily_number, customer_name, customer_phone, customer_email, address, address_notes, payment_method, cash_change_for, status, total, created_at, dispatched_at, order_items(id, product_name, quantity)";

/** Medianoche de hoy en Colombia (UTC−5, sin horario de verano). */
export function inicioDeHoyColombia(): string {
  const fecha = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
  return new Date(`${fecha}T00:00:00-05:00`).toISOString();
}

export type PedidosCocina = { activos: PedidoCocina[]; despachados: PedidoCocina[] };

export async function cargarPedidosCocina(supabase: SupabaseClient): Promise<PedidosCocina> {
  const [activos, despachados] = await Promise.all([
    supabase
      .from("orders")
      .select(CAMPOS)
      .in("status", ["recibido", "preparando"])
      .order("created_at", { ascending: true }),
    supabase
      .from("orders")
      .select(CAMPOS)
      .eq("status", "en_camino")
      .gte("dispatched_at", inicioDeHoyColombia())
      .order("dispatched_at", { ascending: false }),
  ]);
  return {
    activos: (activos.data ?? []) as PedidoCocina[],
    despachados: (despachados.data ?? []) as PedidoCocina[],
  };
}
