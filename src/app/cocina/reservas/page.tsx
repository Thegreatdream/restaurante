import type { Metadata } from "next";
import { obtenerAjustes } from "@/lib/menu";
import { miRol } from "@/lib/panel";
import { fechaLocal } from "@/lib/formato";
import { EncabezadoPanel, SinAcceso } from "../encabezado-panel";
import { PanelReservas } from "./panel";

export const metadata: Metadata = { title: "Reservas", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Reservas() {
  const [rol, ajustes] = await Promise.all([miRol(), obtenerAjustes()]);
  if (rol !== "admin" && rol !== "mesero") return <SinAcceso mensaje="Las reservas las ven los meseros y el administrador." />;
  if (!ajustes.mod_reservations) return <SinAcceso mensaje="Las reservas están apagadas. Actívalas en Ajustes → Módulos." />;
  return (
    <>
      <EncabezadoPanel ajustes={ajustes} rol={rol} actual="reservas" />
      <PanelReservas restauranteId={ajustes.id} timezone={ajustes.timezone} hoy={fechaLocal(ajustes.timezone)} capacidad={ajustes.reservation_capacity} />
    </>
  );
}
