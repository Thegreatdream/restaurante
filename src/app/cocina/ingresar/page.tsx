import type { Metadata } from "next";
import { obtenerAjustes } from "@/lib/menu";
import { FormularioIngreso } from "./formulario";

export const metadata: Metadata = { title: "Ingresar al panel", robots: { index: false } };

export default async function Ingresar() {
  const r = await obtenerAjustes();
  return <FormularioIngreso nombre={r.name} />;
}
