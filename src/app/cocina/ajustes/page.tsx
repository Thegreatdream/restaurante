import type { Metadata } from "next";
import { obtenerAjustes } from "@/lib/menu";
import { supabaseServidor } from "@/lib/supabase/server";
import type { Tramo } from "@/lib/tipos";
import { miRol } from "@/lib/panel";
import { EncabezadoPanel, SinAcceso } from "../encabezado-panel";
import { FormularioAjustes } from "./formulario";

export const metadata: Metadata = { title: "Ajustes", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Ajustes() {
  const [rol, ajustes] = await Promise.all([miRol(), obtenerAjustes()]);
  if (rol !== "admin") return <SinAcceso mensaje="Solo el administrador del restaurante puede ver los ajustes." />;
  const supabase = await supabaseServidor();
  const { data: horarioReservas } = await supabase
    .from("reservation_hours")
    .select("weekday, opens, closes")
    .eq("restaurant_id", ajustes.id)
    .order("weekday");

  return (
    <>
      <EncabezadoPanel ajustes={ajustes} rol={rol} actual="ajustes" />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-24">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Ajustes</h1>
        <p className="mt-1 text-ink-soft">Los cambios se ven en la página de pedidos apenas guardas.</p>
        <FormularioAjustes ajustes={ajustes} horarioReservas={(horarioReservas as Tramo[]) ?? []} />
      </main>
    </>
  );
}
