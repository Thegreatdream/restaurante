import type { Metadata } from "next";
import { supabaseServidor } from "@/lib/supabase/server";
import type { Entrega } from "@/lib/tipos";
import { DetalleEntrega } from "./detalle";
import { TarjetaAviso } from "@/components/tarjeta-aviso";

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
      <main>
        <TarjetaAviso
          pantallaCompleta
          titulo="Entrega no encontrada"
          texto="Este enlace no corresponde a ningún pedido. Revisa el mensaje del restaurante."
        />
      </main>
    );
  }
  return <DetalleEntrega token={token} entrega={entrega} />;
}
