import { NEGOCIO } from "@/lib/negocio";
import type { Ajustes } from "@/lib/tipos";

/** Franja delgada arriba de todo: si estamos recibiendo pedidos, horario y WhatsApp (si están configurados). */
export function BarraInfo({ ajustes }: { ajustes: Ajustes }) {
  return (
    <div className="bg-band pt-[env(safe-area-inset-top)] text-[13px] font-semibold text-band-ink">
      <div className="mx-auto flex h-9 w-full max-w-6xl items-center justify-between gap-4 px-4">
        <p className="flex items-center gap-2">
          <span
            aria-hidden
            className={`size-2 rounded-full ${ajustes.is_open ? "bg-[#7cc792] shadow-[0_0_0_3px_rgba(124,199,146,0.25)]" : "bg-coral"}`}
          />
          {ajustes.is_open ? "Recibiendo pedidos" : "Cerrado por ahora"}
        </p>
        {NEGOCIO.horario && <p className="hidden text-band-soft sm:block">{NEGOCIO.horario}</p>}
        {NEGOCIO.whatsapp ? (
          <a
            href={`https://wa.me/${NEGOCIO.whatsapp}`}
            className="underline decoration-band-soft/50 underline-offset-4 transition-colors hover:decoration-band-ink"
          >
            Escríbenos por WhatsApp
          </a>
        ) : (
          <p className="text-band-soft">Pagas al recibir</p>
        )}
      </div>
    </div>
  );
}
