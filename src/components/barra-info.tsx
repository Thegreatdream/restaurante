import { textoApertura } from "@/lib/apertura";
import { resumenHorario } from "@/lib/formato";
import type { Ajustes } from "@/lib/tipos";

/** Franja delgada arriba de todo: abierto o cerrado (según el horario real), horario y WhatsApp. */
export function BarraInfo({ ajustes }: { ajustes: Ajustes }) {
  const { abierto, corto } = textoApertura(ajustes);
  const horario = resumenHorario(ajustes.horario)[0];
  return (
    <div className="bg-band pt-[env(safe-area-inset-top)] text-[13px] font-semibold text-band-ink">
      <div className="mx-auto flex h-9 w-full max-w-6xl items-center justify-between gap-4 px-4">
        <p className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden
            className={`size-2 shrink-0 rounded-full ${abierto ? "bg-[#7cc792] shadow-[0_0_0_3px_rgba(124,199,146,0.25)]" : "bg-coral"}`}
          />
          <span className="truncate">{corto}</span>
        </p>
        {horario && <p className="hidden text-band-soft lg:block">{horario}</p>}
        {ajustes.whatsapp ? (
          <a
            href={`https://wa.me/${ajustes.whatsapp}`}
            className="shrink-0 underline decoration-band-soft/50 underline-offset-4 transition-colors hover:decoration-band-ink"
          >
            WhatsApp
          </a>
        ) : (
          <p className="hidden shrink-0 text-band-soft sm:block">Pagas al recibir</p>
        )}
      </div>
    </div>
  );
}
