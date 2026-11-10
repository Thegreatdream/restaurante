import type { Metadata } from "next";
import Link from "next/link";
import { Encabezado } from "@/components/encabezado";
import { AvisoDemo } from "@/components/aviso-demo";
import { Atras } from "@/components/iconos";
import { obtenerAjustes } from "@/lib/menu";
import { FormularioReserva } from "./formulario";

export const metadata: Metadata = { title: "Reservar mesa" };
export const dynamic = "force-dynamic";

export default async function Reservar() {
  const ajustes = await obtenerAjustes();
  return (
    <>
      <Encabezado>
        <Link href="/" className="flex items-center gap-1.5 text-sm font-bold">
          <Atras /> Menú
        </Link>
      </Encabezado>
      <AvisoDemo ajustes={ajustes} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-16 md:pt-10">
        <h1 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">Reserva tu mesa</h1>
        {ajustes.mod_reservations ? (
          <>
            <p className="mt-1 text-ink-soft">Elige el día, cuántos son y la hora. Te llega la confirmación por correo.</p>
            <FormularioReserva ajustes={ajustes} />
          </>
        ) : (
          <p className="mt-4 rounded-2xl bg-surface-2 px-4 py-3">Por ahora este restaurante no recibe reservas en línea.</p>
        )}
      </main>
    </>
  );
}
