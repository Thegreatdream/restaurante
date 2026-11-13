import Image from "next/image";
import { Flecha } from "@/components/iconos";
import { PortadaAnimada } from "./portada-animada";
import { textoApertura } from "@/lib/apertura";
import { cop } from "@/lib/formato";
import type { Ajustes } from "@/lib/tipos";

/**
 * Foto de fondo de la portada (en `public/`). Para cambiarla, reemplaza el archivo o esta ruta;
 * con null la portada queda sobre el verde oscuro de la marca.
 */
const FOTO_PORTADA: string | null = "/comida/mesa-compartida.webp";

/** Portada: amplia y tranquila, con el nombre en letra clásica y los dos caminos (pedir o reservar). */
export function Bienvenida({ ajustes }: { ajustes: Ajustes }) {
  const { aviso } = textoApertura(ajustes);
  const servicio = [
    ajustes.mod_delivery && `Domicilio ${ajustes.delivery_fee > 0 ? cop(ajustes.delivery_fee) : "gratis"}`,
    ajustes.mod_pickup && "Para recoger sin costo",
    ajustes.mod_table && "En la mesa",
  ].filter(Boolean) as string[];

  return (
    <PortadaAnimada>
    <section className="relative isolate overflow-hidden bg-band text-band-ink">
      {FOTO_PORTADA && (
        <>
          {/* Foto decorativa: la bandeja queda al centro en celular y computador.
              Sobresale un poco por arriba para que el efecto de profundidad al bajar no deje borde. */}
          <div aria-hidden data-anim="foto" className="absolute inset-x-0 -top-[12%] bottom-0 -z-10 overflow-hidden">
            <Image
              src={FOTO_PORTADA}
              alt=""
              fill
              priority
              sizes="100vw"
              quality={80}
              className="portada-zoom object-cover object-[50%_48%]"
            />
          </div>
          {/* Velo oscuro: más denso en el centro y abajo, donde están el título, el texto y los botones */}
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgb(12_18_15/0.72)_0%,rgb(12_18_15/0.58)_55%,rgb(12_18_15/0.5)_100%),linear-gradient(to_bottom,rgb(12_18_15/0.25),rgb(12_18_15/0.6))]"
          />
        </>
      )}

      <div className="mx-auto flex min-h-[min(78svh,640px)] w-full max-w-4xl flex-col items-center justify-center px-6 py-20 text-center md:py-28">
        <p data-anim="etiqueta" className="antetitulo text-band-soft">
          Almuerzos caseros · hechos cada día
        </p>
        <h1
          data-anim="titulo"
          className="mt-6 font-display text-[3.25rem] leading-[0.95] font-medium tracking-[0.04em] uppercase sm:text-7xl md:text-[6.5rem]"
        >
          {ajustes.name}
        </h1>
        <span aria-hidden data-anim="linea" className="mt-7 block h-px w-16 bg-brand" />
        <p data-anim="resto" className="mt-7 max-w-[34ch] text-lg leading-relaxed font-light text-band-ink/90 md:text-xl">
          {ajustes.tagline ?? "El almuerzo de la casa, con sazón de siempre. Para comer aquí, recoger o pedir a domicilio."}
        </p>
        <div data-anim="resto" className="mt-10 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row sm:gap-4">
          <a href="#menu" className="btn w-full sm:w-auto">
            Ver el menú <Flecha />
          </a>
          {ajustes.mod_reservations && (
            <a
              href="/reservar"
              className="btn w-full border-band-ink/60 bg-transparent text-band-ink hover:!bg-band-ink hover:text-band sm:w-auto"
            >
              Reservar mesa
            </a>
          )}
        </div>
        {servicio.length > 0 && (
          <p data-anim="resto" className="mt-8 text-[13px] tracking-[0.14em] text-band-soft uppercase">
            {servicio.join("  ·  ")}
          </p>
        )}
      </div>

      {aviso && (
        <p className="relative border-t border-white/10 bg-black/20 px-4 py-3 text-center text-sm text-band-ink">{aviso}</p>
      )}
    </section>
    </PortadaAnimada>
  );
}
