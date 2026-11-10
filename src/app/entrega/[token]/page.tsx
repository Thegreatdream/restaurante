import type { Metadata } from "next";
import { supabaseServidor } from "@/lib/supabase/server";
import type { Entrega } from "@/lib/tipos";
import { DetalleEntrega } from "./detalle";

export const metadata: Metadata = { title: "Entrega", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Link privado de una entrega: todo lo que el domiciliario necesita para llevar el pedido. */
export default async function PaginaEntrega({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await supabaseServidor();
  const { data } = await supabase.rpc("get_delivery", { p_token: token });
  const entrega = data as Entrega | null;

  if (!entrega) {
    return (
      <main className="grid min-h-dvh place-items-center px-4 text-center">
        <div className="max-w-sm rounded-[1.75rem] bg-surface p-6 sticker">
          <h1 className="font-display text-2xl font-extrabold">Entrega no encontrada</h1>
          <p className="mt-2 text-ink-soft">Este enlace no corresponde a ningún pedido. Revisa el mensaje del restaurante.</p>
        </div>
      </main>
    );
  }
  return <DetalleEntrega token={token} entrega={entrega} />;
}
