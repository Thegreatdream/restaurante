import { Tato } from "@/components/tato";
import { cop } from "@/lib/formato";
import type { Ajustes } from "@/lib/tipos";

export function Bienvenida({ ajustes }: { ajustes: Ajustes }) {
  return (
    <section className="relative mt-4 overflow-hidden rounded-[1.75rem] bg-surface-2 sticker md:mt-8">
      <div className="relative min-h-[250px] px-5 pt-5 pb-5 md:min-h-[340px] md:px-10 md:pt-9">
        <h1 className="relative z-10 font-display text-[2.5rem] leading-[0.95] font-extrabold tracking-tight md:text-6xl">
          ¡Bienvenido!
        </h1>
        <div className="relative z-10 pr-[100px] md:pr-[220px]">
          <p className="mt-3 max-w-[30ch] text-[15px] leading-snug text-ink-soft md:text-lg">
            Soy Tato. Elige tus platos y te los llevamos calientitos hasta la puerta.
          </p>
          <ul className="mt-4 flex flex-wrap gap-2 text-[13px] font-semibold md:text-sm">
            <li className="rounded-full border-2 border-outline bg-surface px-3 py-1">
              Domicilio {ajustes.delivery_fee > 0 ? cop(ajustes.delivery_fee) : "gratis"}
            </li>
            <li className="rounded-full border-2 border-outline bg-surface px-3 py-1">Pagas al recibir</li>
          </ul>
        </div>
        <Tato
          pose="bienvenida"
          priority
          sizes="(min-width: 768px) 180px, 104px"
          className="absolute right-3 -bottom-2 w-[104px] md:right-10 md:w-[180px]"
        />
      </div>
      {!ajustes.is_open && (
        <p className="relative z-10 border-t-2 border-outline bg-coral px-5 py-3 text-sm font-semibold text-[#1e1a17] md:px-10">
          Ahora estamos cerrados. Puedes ver el menú, pero no recibimos pedidos en este momento.
        </p>
      )}
    </section>
  );
}
