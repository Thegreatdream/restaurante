import type { Metadata } from "next";
import { supabaseServidor } from "@/lib/supabase/server";
import { obtenerAjustes } from "@/lib/menu";
import { NEGOCIO } from "@/lib/negocio";
import { cerrarSesion } from "./acciones";
import { PanelCocina } from "./panel";
import { cargarPedidosCocina } from "./datos";

export const metadata: Metadata = { title: "Cocina", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Cocina() {
  const supabase = await supabaseServidor();
  const { data: esStaff } = await supabase.rpc("is_staff");

  if (!esStaff) {
    return (
      <main className="grid min-h-dvh place-items-center px-4">
        <div className="max-w-sm rounded-[1.75rem] bg-surface p-6 text-center sticker">
          <h1 className="font-display text-2xl font-extrabold">Sin acceso</h1>
          <p className="mt-2 text-ink-soft">Esta cuenta no está registrada como personal del restaurante.</p>
          <form action={cerrarSesion}>
            <button className="btn btn-ghost mt-5">Cerrar sesión</button>
          </form>
        </div>
      </main>
    );
  }

  const [pedidos, ajustes] = await Promise.all([cargarPedidosCocina(supabase), obtenerAjustes()]);

  return (
    <>
      <header className="border-b-2 border-outline bg-bg pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <p className="font-display text-xl font-extrabold">
            {NEGOCIO.nombre} <span className="text-ink-soft">· Cocina</span>
          </p>
          <form action={cerrarSesion}>
            <button className="text-sm font-bold text-ink-soft underline-offset-4 hover:underline">Salir</button>
          </form>
        </div>
      </header>
      <PanelCocina inicial={pedidos} retrasoMinutos={ajustes.prep_delay_minutes} modoDemo={ajustes.demo_mode} />
    </>
  );
}
