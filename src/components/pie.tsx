import Image from "next/image";
import { NEGOCIO } from "@/lib/negocio";
import { cop } from "@/lib/formato";
import type { Ajustes } from "@/lib/tipos";

/** Pie de página en la franja oscura de marca. Solo muestra los datos que estén configurados. */
export function Pie({ ajustes }: { ajustes: Ajustes }) {
  const datos: [string, React.ReactNode][] = [
    ["Domicilio", ajustes.delivery_fee > 0 ? cop(ajustes.delivery_fee) : "Gratis"],
    ["Pago", "Efectivo o transferencia, al recibir"],
  ];
  if (NEGOCIO.horario) datos.push(["Horario", NEGOCIO.horario]);
  if (NEGOCIO.zona) datos.push(["Entregamos en", NEGOCIO.zona]);
  if (NEGOCIO.whatsapp)
    datos.push([
      "WhatsApp",
      <a key="wa" href={`https://wa.me/${NEGOCIO.whatsapp}`} className="underline underline-offset-4">
        Escríbenos
      </a>,
    ]);
  if (NEGOCIO.instagram)
    datos.push([
      "Instagram",
      <a key="ig" href={`https://instagram.com/${NEGOCIO.instagram}`} className="underline underline-offset-4">
        @{NEGOCIO.instagram}
      </a>,
    ]);

  return (
    <footer className="pb-safe mt-auto border-t-2 border-outline bg-band text-band-ink">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 pt-10 pb-28 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:pb-12">
        <div className="flex items-center gap-4">
          <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-outline bg-surface-2">
            <Image src="/tato/cara.png" alt="" width={192} height={192} className="mt-1.5 size-full object-cover" />
          </span>
          <div>
            <p className="font-display text-3xl leading-none font-extrabold tracking-tight">{NEGOCIO.nombre}</p>
            <p className="mt-1.5 text-band-soft">{NEGOCIO.lema}</p>
          </div>
        </div>
        <dl className="grid gap-x-8 gap-y-4 text-[15px] sm:grid-cols-2">
          {datos.map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs font-bold tracking-wide text-band-soft uppercase">{k}</dt>
              <dd className="mt-0.5 font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
      <p className="mx-auto w-full max-w-6xl border-t border-white/10 px-4 py-4 text-xs text-band-soft">
        © {new Date().getFullYear()} {NEGOCIO.nombre}
      </p>
    </footer>
  );
}
