import { Tato } from "@/components/tato";
import { Flecha } from "@/components/iconos";
import { textoApertura } from "@/lib/apertura";
import { cop, saludo } from "@/lib/formato";
import type { Ajustes } from "@/lib/tipos";

/** Portada: franja oscura de marca, título grande y Tato sobre su fondo verde hoja. */
export function Bienvenida({ ajustes }: { ajustes: Ajustes }) {
  const { aviso } = textoApertura(ajustes);

  return (
    <section className="relative overflow-hidden border-b-2 border-outline bg-band text-band-ink">
      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pt-8 pb-9 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:pt-16 md:pb-16">
        <div className="portada-entra relative z-10">
          <h1 className="font-display text-[2.6rem] leading-[0.9] font-extrabold tracking-[-0.03em] uppercase sm:text-6xl md:text-[5.25rem]">
            ¡Bienvenido<span className="text-brand">!</span>
          </h1>
          <span aria-hidden className="mt-5 block h-1 w-14 rounded-full bg-brand md:mt-7" />
          <p className="mt-5 max-w-[22ch] pr-24 text-lg leading-snug font-semibold sm:pr-0 md:mt-7 md:max-w-[28ch] md:text-2xl">
            {saludo()}, {ajustes.mascot === "tato" ? "soy Tato. " : ""}¿Qué se te antoja hoy?
          </p>
          <p className="mt-2 max-w-[34ch] pr-24 text-[15px] leading-snug text-band-soft sm:pr-0 md:max-w-[40ch] md:text-lg">
            Comida casera hecha al momento y llevada calientita hasta tu puerta.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 md:mt-9">
            <a href="#menu" className="btn">
              Ver el menú <Flecha />
            </a>
            {ajustes.mod_reservations && (
              <a href="/reservar" className="btn btn-ghost">
                Reservar mesa
              </a>
            )}
            <p className="hidden text-sm font-semibold text-band-soft sm:block">
              {[
                ajustes.mod_delivery && `Domicilio ${ajustes.delivery_fee > 0 ? cop(ajustes.delivery_fee) : "gratis"}`,
                ajustes.mod_pickup && "o recoge sin costo",
              ]
                .filter(Boolean)
                .join(" ")}
            </p>
          </div>
        </div>

        {/*
          Un solo Tato. El mismo contenedor es un círculo verde asomado en la esquina en el celular
          y un panel verde con ramitas en el computador (naranja sobre verde: colores complementarios).
        */}
        <div
          className="patron-panel absolute -right-10 -bottom-12 size-[180px] rounded-full border-2 border-outline bg-hoja md:relative md:right-auto md:bottom-auto md:ml-auto md:aspect-[5/4] md:size-auto md:w-full md:max-w-[460px] md:rounded-[2rem] md:shadow-[6px_6px_0_#000]"
        >
          <Tato
            pose="bienvenida"
            mascota={ajustes.mascot}
            priority
            sizes="(min-width: 768px) 230px, 100px"
            className="absolute bottom-[46px] left-[18px] w-[100px] md:bottom-[-24px] md:left-1/2 md:w-1/2 md:-translate-x-1/2"
          />
        </div>
      </div>

      {aviso && (
        <p className="relative z-10 border-t-2 border-outline bg-coral px-4 py-3 text-center text-sm font-semibold text-[#1e1a17]">
          {aviso}
        </p>
      )}
    </section>
  );
}
