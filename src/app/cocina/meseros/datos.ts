import type { SupabaseClient } from "@supabase/supabase-js";
import type { EstadoPedido } from "@/lib/tipos";

export type PedidoMesa = {
  id: string;
  daily_number: number;
  status: EstadoPedido;
  total: number;
  customer_name: string;
  table_label: string | null;
  ready_at: string | null;
  order_items: { product_name: string; quantity: number }[];
};

export type CuentaAbierta = {
  id: string;
  table_id: string;
  confirmed_at: string | null;
  opened_at: string;
  restaurant_tables: { label: string } | null;
  orders: PedidoMesa[];
};

export type Aviso = {
  id: string;
  kind: "mesero" | "cuenta";
  created_at: string;
  session_id: string;
  table_sessions: { restaurant_tables: { label: string } | null } | null;
};

export type MesaSimple = { id: string; label: string };

export type DatosMeseros = {
  avisos: Aviso[];
  cuentas: CuentaAbierta[];
  porLlevar: PedidoMesa[];
  mesas: MesaSimple[];
};

const PEDIDO = "id, daily_number, status, total, customer_name, table_label, ready_at, order_items(product_name, quantity)";

/** Todo lo que necesita el mesero, solo de este restaurante (la base de datos además lo exige). */
export async function cargarDatosMeseros(supabase: SupabaseClient, restauranteId: string): Promise<DatosMeseros> {
  const [avisos, cuentas, porLlevar, mesas] = await Promise.all([
    supabase
      .from("service_calls")
      .select("id, kind, created_at, session_id, table_sessions(restaurant_tables(label))")
      .eq("restaurant_id", restauranteId)
      .eq("status", "pendiente")
      .order("created_at", { ascending: true }),
    supabase
      .from("table_sessions")
      .select(`id, table_id, confirmed_at, opened_at, restaurant_tables(label), orders(${PEDIDO})`)
      .eq("restaurant_id", restauranteId)
      .eq("status", "abierta")
      .order("opened_at", { ascending: true }),
    supabase
      .from("orders")
      .select(PEDIDO)
      .eq("restaurant_id", restauranteId)
      .eq("order_type", "mesa")
      .eq("status", "va_mesa")
      .order("ready_at", { ascending: true }),
    supabase
      .from("restaurant_tables")
      .select("id, label")
      .eq("restaurant_id", restauranteId)
      .eq("active", true)
      .order("position")
      .order("label"),
  ]);
  return {
    avisos: (avisos.data ?? []) as unknown as Aviso[],
    cuentas: (cuentas.data ?? []) as unknown as CuentaAbierta[],
    porLlevar: (porLlevar.data ?? []) as PedidoMesa[],
    mesas: (mesas.data ?? []) as MesaSimple[],
  };
}
