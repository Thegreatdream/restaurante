import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Encabezado } from "@/components/encabezado";
import { AvisoDemo } from "@/components/aviso-demo";
import { BotonesContacto } from "@/components/contacto";
import { supabaseServidor } from "@/lib/supabase/server";
import { obtenerAjustes, supabaseConfigurado } from "@/lib/menu";
import type { PedidoPublico } from "@/lib/tipos";
import { SeguimientoPedido } from "./seguimiento";

export const metadata: Metadata = { title: "Tu pedido", robots: { index: false } };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function Pedido({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id) || !supabaseConfigurado) notFound();

  const supabase = await supabaseServidor();
  const [{ data }, ajustes] = await Promise.all([supabase.rpc("get_order", { p_id: id }), obtenerAjustes()]);
  if (!data) notFound();

  const hayContacto = Boolean(ajustes.whatsapp || ajustes.phone);

  return (
    <>
      <Encabezado />
      <AvisoDemo ajustes={ajustes} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-4 pb-12 md:pt-10">
        <SeguimientoPedido inicial={data as PedidoPublico} />
        {hayContacto && (
          <section className="mt-6 rounded-[1.75rem] border-2 border-line bg-surface p-5">
            <h2 className="font-display text-xl font-extrabold">¿Dudas con tu pedido?</h2>
            <p className="mt-1 text-sm text-ink-soft">Escríbenos o llámanos y te ayudamos.</p>
            <BotonesContacto ajustes={ajustes} className="mt-4" />
          </section>
        )}
      </main>
    </>
  );
}
