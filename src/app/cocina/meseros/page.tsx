import type { Metadata } from "next";
import { supabaseServidor } from "@/lib/supabase/server";
import { obtenerMenu } from "@/lib/menu";
import { miRol } from "@/lib/panel";
import { EncabezadoPanel, SinAcceso } from "../encabezado-panel";
import { cargarDatosMeseros } from "./datos";
import { PanelMeseros } from "./panel";

export const metadata: Metadata = { title: "Meseros", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Meseros() {
  const [rol, { ajustes, categorias }] = await Promise.all([miRol(), obtenerMenu()]);
  if (rol !== "admin" && rol !== "mesero") return <SinAcceso mensaje="Esta vista es para meseros y el administrador." />;
  if (!ajustes.mod_table) return <SinAcceso mensaje="El pedido en mesa está apagado. Actívalo en Ajustes → Módulos." />;

  const supabase = await supabaseServidor();
  const datos = await cargarDatosMeseros(supabase, ajustes.id);

  return (
    <>
      <EncabezadoPanel ajustes={ajustes} rol={rol} actual="meseros" />
      <PanelMeseros restauranteId={ajustes.id} inicial={datos} categorias={categorias} />
    </>
  );
}
