import type { Metadata } from "next";
import { supabaseServidor } from "@/lib/supabase/server";
import { obtenerAjustes } from "@/lib/menu";
import type { VistaDomiciliario } from "@/lib/tipos";
import { PanelDomiciliario } from "./panel";
import { TarjetaAviso } from "@/components/tarjeta-aviso";

export const metadata: Metadata = { title: "Domicilios", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Link personal del domiciliario (sin contraseña): pedidos para tomar y sus entregas en curso. */
export default async function Repartidor({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [supabase, ajustes] = await Promise.all([supabaseServidor(), obtenerAjustes()]);
  const { data } = await supabase.rpc("courier_view", { p_token: token });
  const vista = data as VistaDomiciliario | null;

  if (!vista || vista.restaurant_id !== ajustes.id) {
    return (
      <main>
        <TarjetaAviso
          pantallaCompleta
          titulo="Enlace no válido"
          texto="Este enlace de domiciliario no existe o fue desactivado. Pídele uno nuevo al restaurante."
        />
      </main>
    );
  }
  return <PanelDomiciliario token={token} inicial={vista} restaurante={ajustes.name} />;
}
