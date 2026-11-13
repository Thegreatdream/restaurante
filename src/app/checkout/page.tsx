import type { Metadata } from "next";
import Link from "next/link";
import { Encabezado } from "@/components/encabezado";
import { Atras } from "@/components/iconos";
import { AvisoDemo } from "@/components/aviso-demo";
import { obtenerMenu } from "@/lib/menu";
import { SincronizarCarrito } from "@/components/carrito/sincronizar-carrito";
import { FormularioEntrega } from "./formulario";

export const metadata: Metadata = { title: "Finalizar pedido", robots: { index: false } };

export default async function Checkout() {
  const { categorias, ajustes, demo } = await obtenerMenu();
  const productos = categorias.flatMap((c) => c.products.map((p) => ({ id: p.id, name: p.name, price: p.price })));
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
        <p className="antetitulo text-ink-soft">Finalizar pedido</p>
        <h1 className="mt-2 font-display text-4xl leading-tight md:text-5xl">{titulo}</h1>
        <p className="mt-2 text-ink-soft">Solo pedimos lo necesario para tu pedido.</p>
        {!demo && <SincronizarCarrito productos={productos} className="mt-5" />}
        <FormularioEntrega ajustes={ajustes} />
      </main>
    </>
  );
}
