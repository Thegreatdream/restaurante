import type { Metadata } from "next";
import { headers } from "next/headers";
import { supabaseServidor } from "@/lib/supabase/server";
import { obtenerAjustes } from "@/lib/menu";
import { miRol } from "@/lib/panel";
import { EncabezadoPanel, SinAcceso } from "../encabezado-panel";
import { AdminMesas } from "./admin";

export const metadata: Metadata = { title: "Mesas", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Mesas() {
  const [rol, ajustes] = await Promise.all([miRol(), obtenerAjustes()]);
  if (rol !== "admin") return <SinAcceso mensaje="Solo el administrador puede administrar las mesas." />;
  if (!ajustes.mod_table) return <SinAcceso mensaje="El pedido en mesa está apagado. Actívalo en Ajustes → Módulos." />;

  const supabase = await supabaseServidor();
  const { data: mesas } = await supabase
    .from("restaurant_tables")
    .select("id, label, token, active")
    .eq("restaurant_id", ajustes.id)
    .order("position")
    .order("label");

  // Dirección base del QR: el dominio del restaurante, o la dirección con la que se abrió el panel
  const host = (await headers()).get("host") ?? "";
  const base = ajustes.domain ? `https://${ajustes.domain}` : `${host.startsWith("localhost") ? "http" : "https"}://${host}`;

  return (
    <>
      <EncabezadoPanel ajustes={ajustes} rol={rol} actual="mesas" />
      <AdminMesas mesas={mesas ?? []} base={base} nombre={ajustes.name} />
    </>
  );
}
