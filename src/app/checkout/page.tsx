import type { Metadata } from "next";
import Link from "next/link";
import { Encabezado } from "@/components/encabezado";
import { Atras } from "@/components/iconos";
import { AvisoDemo } from "@/components/aviso-demo";
import { obtenerAjustes } from "@/lib/menu";
import { FormularioEntrega } from "./formulario";

export const metadata: Metadata = { title: "Finalizar pedido" };

export default async function Checkout() {
  const ajustes = await obtenerAjustes();
  const ambos = ajustes.mod_delivery && ajustes.mod_pickup;
  const titulo = ambos ? "¿Cómo quieres tu pedido?" : ajustes.mod_pickup ? "¿A qué hora pasas?" : "¿A dónde te lo llevamos?";
  return (
    <>
      <Encabezado>
        <Link href="/" className="flex items-center gap-1.5 text-sm font-bold">
          <Atras /> Menú
        </Link>
      </Encabezado>
      <AvisoDemo ajustes={ajustes} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-10 md:pt-10">
        <h1 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">{titulo}</h1>
        <p className="mt-1 text-ink-soft">Solo pedimos lo necesario para tu pedido.</p>
        <FormularioEntrega ajustes={ajustes} />
      </main>
    </>
  );
}
