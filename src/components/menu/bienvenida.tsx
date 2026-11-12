import { Flecha } from "@/components/iconos";
import { textoApertura } from "@/lib/apertura";
import { cop } from "@/lib/formato";
import type { Ajustes } from "@/lib/tipos";

/**
 * Foto de la portada. Cuando llegue la foto del restaurante, guárdala en `public/portada.jpg`
 * y cambia esta línea a: const FOTO_PORTADA: string | null = "/portada.jpg";
 * Mientras tanto la portada se ve sobre el verde oscuro de la marca.
 */
const FOTO_PORTADA: string | null = null;

/** Portada: amplia y tranquila, con el nombre en letra clásica y los dos caminos (pedir o reservar). */
export function Bienvenida({ ajustes }: { ajustes: Ajustes }) {
  const { aviso } = textoApertura(ajustes);
  const servicio = [
    ajustes.mod_delivery && `Domicilio ${ajustes.delivery_fee > 0 ? cop(ajustes.delivery_fee) : "gratis"}`,
    ajustes.mod_pickup && "Para recoger sin costo",
    ajustes.mod_table && "En la mesa",
  ].filter(Boolean) as string[];

  return (
    <section className="relative isolate overflow-hidden bg-band text-band-ink">
      {FOTO_PORTADA && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={FOTO_PORTADA} alt="" className="absolute inset-0 -z-10 size-full object-cover" fetchPriority="high" />
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-black/45 via-black/35 to-black/65" />
        </>
      )}

      <div className="portada-entra mx-auto flex min-h-[min(78svh,640px)] w-full max-w-4xl flex-col items-center justify-center px-6 py-20 text-center md:py-28">
        <p className="antetitulo text-band-soft">Almuerzos caseros · hechos cada día</p>
        <h1 className="mt-6 font-display text-[3.25rem] leading-[0.95] font-medium tracking-[0.04em] uppercase sm:text-7xl md:text-[6.5rem]">
          {ajustes.name}
        </h1>
        <span aria-hidden className="mt-7 block h-px w-16 bg-brand" />
        <p className="mt-7 max-w-[34ch] text-lg leading-relaxed font-light text-band-ink/90 md:text-xl">
          {ajustes.tagline ?? "El almuerzo de la casa, con sazón de siempre. Para comer aquí, recoger o pedir a domicilio."}
        </p>
        <div className="mt-10 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row sm:gap-4">
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
          <p className="mt-8 text-[13px] tracking-[0.14em] text-band-soft uppercase">{servicio.join("  ·  ")}</p>
        )}
      </div>

      {aviso && (
        <p className="relative border-t border-white/10 bg-black/20 px-4 py-3 text-center text-sm text-band-ink">{aviso}</p>
      )}
    </section>
  );
}
