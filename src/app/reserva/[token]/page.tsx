import type { Metadata } from "next";
import { Encabezado } from "@/components/encabezado";
import { AvisoDemo } from "@/components/aviso-demo";
import { supabaseServidor } from "@/lib/supabase/server";
import { obtenerAjustes } from "@/lib/menu";
import type { ReservaPublica } from "@/lib/tipos";
import { DetalleReserva } from "./detalle";
import { TarjetaAviso } from "@/components/tarjeta-aviso";

export const metadata: Metadata = { title: "Tu reserva", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function PaginaReserva({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [supabase, ajustes] = await Promise.all([supabaseServidor(), obtenerAjustes()]);
  const { data } = await supabase.rpc("get_reservation", { p_token: token });
  const reserva = data as ReservaPublica | null;

  return (
    <>
      <Encabezado />
      <AvisoDemo ajustes={ajustes} />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 pt-6 pb-16 md:pt-10">
        {!reserva || reserva.restaurant_id !== ajustes.id ? (
          <TarjetaAviso titulo="Reserva no encontrada" texto="Revisa el enlace del correo de confirmación." mascota={ajustes.mascot} />
        ) : (
          <DetalleReserva
            token={token}
            reserva={reserva}
            restaurante={{ nombre: ajustes.name, direccion: ajustes.address, mapa: ajustes.maps_url, timezone: ajustes.timezone }}
          />
        )}
      </main>
    </>
  );
}
