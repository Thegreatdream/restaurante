import type { Metadata } from "next";
import { supabaseServidor } from "@/lib/supabase/server";
import { obtenerAjustes } from "@/lib/menu";
import { miRol } from "@/lib/panel";
import { urlPublica } from "@/lib/sitio";
import type { Domiciliario } from "@/lib/tipos";
import { EncabezadoPanel, SinAcceso } from "../encabezado-panel";
import { AdminDomiciliarios } from "./admin";

export const metadata: Metadata = { title: "Domiciliarios", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Domiciliarios() {
  const [rol, ajustes] = await Promise.all([miRol(), obtenerAjustes()]);
  if (rol !== "admin") return <SinAcceso mensaje="Solo el administrador puede administrar domiciliarios." />;

  const supabase = await supabaseServidor();
  const [{ data }, base] = await Promise.all([
    supabase.from("couriers").select("id, name, phone, token, active").eq("restaurant_id", ajustes.id).order("active", { ascending: false }).order("name"),
    urlPublica(ajustes),
  ]);

  return (
    <>
      <EncabezadoPanel ajustes={ajustes} rol={rol} actual="domiciliarios" />
      <AdminDomiciliarios domiciliarios={(data as Domiciliario[]) ?? []} base={base} restaurante={ajustes.name} />
    </>
  );
}
