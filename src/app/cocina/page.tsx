import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { supabaseServidor } from "@/lib/supabase/server";
import { obtenerAjustes } from "@/lib/menu";
import { miRol } from "@/lib/panel";
import { PanelCocina } from "./panel";
import { cargarPedidosCocina } from "./datos";
import { EncabezadoPanel, SinAcceso } from "./encabezado-panel";

export const metadata: Metadata = { title: "Cocina", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Cocina() {
  const [rol, ajustes] = await Promise.all([miRol(), obtenerAjustes()]);

  if (!rol) return <SinAcceso mensaje={`Esta cuenta no pertenece al equipo de ${ajustes.name}.`} />;
  if (rol === "mesero") {
    if (ajustes.mod_table) redirect("/cocina/meseros");
    return <SinAcceso mensaje="El pedido en mesa está apagado. Pídele al administrador que lo active." />;
  }

  const supabase = await supabaseServidor();
  const pedidos = await cargarPedidosCocina(supabase, ajustes.id);

  return (
    <>
      <EncabezadoPanel ajustes={ajustes} rol={rol} actual="pedidos" />
      <PanelCocina
        restauranteId={ajustes.id}
        inicial={pedidos}
        retrasoMinutos={ajustes.prep_delay_minutes}
        modoDemo={ajustes.demo_mode}
      />
    </>
  );
}
