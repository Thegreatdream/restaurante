import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Encabezado } from "@/components/encabezado";
import { supabaseServidor } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/menu";
import type { PedidoPublico } from "@/lib/tipos";
import { SeguimientoPedido } from "./seguimiento";

export const metadata: Metadata = { title: "Tu pedido", robots: { index: false } };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function Pedido({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id) || !supabaseConfigurado) notFound();

  const supabase = await supabaseServidor();
  const { data } = await supabase.rpc("get_order", { p_id: id });
  if (!data) notFound();

  return (
    <>
      <Encabezado />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-4 pb-12 md:pt-10">
        <SeguimientoPedido inicial={data as PedidoPublico} />
      </main>
    </>
  );
}
