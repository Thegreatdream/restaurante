import { Tato } from "@/components/tato";
import { Flecha } from "@/components/iconos";
import { cop, saludo } from "@/lib/formato";
import type { Ajustes } from "@/lib/tipos";

/** Portada: franja oscura de marca, título grande y Tato saliendo de su panel naranja. */
export function Bienvenida({ ajustes }: { ajustes: Ajustes }) {
  return (
    <section className="relative overflow-hidden border-b-2 border-outline bg-band text-band-ink">
      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pt-8 pb-9 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:pt-16 md:pb-16">
        <div className="portada-entra relative z-10">
          <h1 className="font-display text-[2.6rem] leading-[0.9] font-extrabold tracking-[-0.03em] uppercase sm:text-6xl md:text-[5.25rem]">
            ¡Bienvenido<span className="text-brand">!</span>
          </h1>
          <span aria-hidden className="mt-5 block h-1 w-14 rounded-full bg-coral md:mt-7" />
          <p className="mt-5 max-w-[22ch] pr-24 text-lg leading-snug font-semibold sm:pr-0 md:mt-7 md:max-w-[28ch] md:text-2xl">
            {saludo()}, soy Tato. ¿Qué se te antoja hoy?
          </p>
          <p className="mt-2 max-w-[34ch] pr-24 text-[15px] leading-snug text-band-soft sm:pr-0 md:max-w-[40ch] md:text-lg">
            Comida casera hecha al momento y llevada calientita hasta tu puerta.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 md:mt-9">
            <a href="#menu" className="btn">
              Ver el menú <Flecha />
            </a>
            <p className="text-sm font-semibold text-band-soft">
              Domicilio {ajustes.delivery_fee > 0 ? cop(ajustes.delivery_fee) : "gratis"}
            </p>
          </div>
        </div>

        {/* Computador: Tato sale por encima de su panel naranja con ramitas */}
        <div className="relative hidden md:block">
          <div className="patron-panel relative ml-auto aspect-[5/4] w-full max-w-[460px] rounded-[2rem] border-2 border-outline bg-brand shadow-[6px_6px_0_#000]">
            <Tato
              pose="bienvenida"
              priority
              sizes="240px"
              className="absolute -bottom-6 left-1/2 w-[50%] -translate-x-1/2"
            />
          </div>
        </div>
      </div>

      {/* Celular: Tato asomado en la esquina */}
      <Tato
        pose="bienvenida"
        priority
        sizes="104px"
        className="absolute right-2 -bottom-3 w-[100px] sm:w-[120px] md:hidden"
      />

      {!ajustes.is_open && (
        <p className="relative z-10 border-t-2 border-outline bg-coral px-4 py-3 text-center text-sm font-semibold text-[#1e1a17]">
          Ahora estamos cerrados. Puedes ver el menú, pero no recibimos pedidos en este momento.
        </p>
      )}
    </section>
  );
}
