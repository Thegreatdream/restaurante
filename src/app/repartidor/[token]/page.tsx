import type { Metadata } from "next";
import { supabaseServidor } from "@/lib/supabase/server";
import { obtenerAjustes } from "@/lib/menu";
import type { VistaDomiciliario } from "@/lib/tipos";
import { PanelDomiciliario } from "./panel";

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
      <main className="grid min-h-dvh place-items-center px-4 text-center">
        <div className="max-w-sm rounded-[1.75rem] bg-surface p-6 sticker">
          <h1 className="font-display text-2xl font-extrabold">Enlace no válido</h1>
          <p className="mt-2 text-ink-soft">Este enlace de domiciliario no existe o fue desactivado. Pídele uno nuevo al restaurante.</p>
        </div>
      </main>
    );
  }
  return <PanelDomiciliario token={token} inicial={vista} restaurante={ajustes.name} />;
}
