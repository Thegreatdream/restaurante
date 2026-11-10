import type { Metadata } from "next";
import { Encabezado } from "@/components/encabezado";
import { AvisoDemo } from "@/components/aviso-demo";
import { supabaseServidor } from "@/lib/supabase/server";
import { obtenerMenu } from "@/lib/menu";
import type { SesionMesa } from "@/lib/tipos";
import { MesaCliente } from "./cliente";

export const metadata: Metadata = { title: "Pedir en la mesa", robots: { index: false } };
export const dynamic = "force-dynamic";

const MENSAJES: Record<string, string> = {
  MESA_NO_EXISTE: "Este código QR no corresponde a ninguna mesa activa. Pídele ayuda al mesero.",
  MODULO_INACTIVO: "El pedido desde la mesa no está disponible en este momento. Pídele la carta al mesero.",
};

/** Lo que abre el QR de cada mesa: el menú en modo mesa, unido a la cuenta abierta de esa mesa. */
export default async function Mesa({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [{ categorias, ajustes }, supabase] = await Promise.all([obtenerMenu(), supabaseServidor()]);
  const { data, error } = await supabase.rpc("open_table_session", { p_token: token });
  const sesion = data as SesionMesa | null;

  let problema: string | null = null;
  if (error || !sesion) {
    const codigo = Object.keys(MENSAJES).find((k) => error?.message.includes(k));
    problema = codigo ? MENSAJES[codigo] : "No pudimos abrir la mesa. Intenta escanear de nuevo.";
  } else if (sesion.restaurant_id !== ajustes.id) {
    problema = "Este QR es de otro restaurante.";
  }

  return (
    <>
      <Encabezado />
      <AvisoDemo ajustes={ajustes} />
      {problema || !sesion ? (
        <main className="mx-auto grid w-full max-w-md flex-1 place-items-center px-4 py-16 text-center">
          <div className="rounded-[1.75rem] bg-surface p-6 sticker">
            <h1 className="font-display text-2xl font-extrabold">No pudimos abrir la mesa</h1>
            <p className="mt-2 text-ink-soft">{problema}</p>
          </div>
        </main>
      ) : (
        <MesaCliente sesion={sesion} ajustes={ajustes} categorias={categorias} />
      )}
    </>
  );
}
