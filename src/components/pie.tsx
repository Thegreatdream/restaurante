import Link from "next/link";
import { cop, resumenHorario } from "@/lib/formato";
import type { Ajustes } from "@/lib/tipos";
import { BotonesContacto, redesDe, telefonoVisible } from "@/components/contacto";
import { Logo } from "@/components/encabezado";

/** Pie de página en la franja oscura de marca. Solo muestra los datos que estén configurados. */
export function Pie({ ajustes }: { ajustes: Ajustes }) {
  const horario = resumenHorario(ajustes.horario);
  const redes = redesDe(ajustes);
  const datos: [string, React.ReactNode][] = [];
  if (horario.length)
    datos.push([
      "Horario",
      horario.map((h) => (
        <span key={h} className="block">
          {h}
        </span>
      )),
    ]);
  if (ajustes.mod_delivery) datos.push(["Domicilio", ajustes.delivery_fee > 0 ? cop(ajustes.delivery_fee) : "Gratis"]);
  if (ajustes.mod_pickup) datos.push(["Para recoger", "Sin costo, en el restaurante"]);
  datos.push(["Pago", ajustes.mod_delivery ? "Efectivo o transferencia, al recibir" : "Efectivo o transferencia, al recoger"]);
  if (ajustes.address) datos.push(["Dirección", ajustes.address]);
  if (ajustes.phone)
    datos.push([
      "Teléfono",
      <a key="tel" href={`tel:+57${ajustes.phone}`} className="tabular underline underline-offset-4">
        {telefonoVisible(ajustes.phone)}
      </a>,
    ]);
  if (redes.length)
    datos.push([
      "Redes",
      redes.map((r) => (
        <a key={r.nombre} href={r.href} target="_blank" rel="noopener" className="mr-4 inline-block underline underline-offset-4">
          {r.nombre}
        </a>
      )),
    ]);

  return (
    <footer className="pb-safe mt-auto border-t-2 border-outline bg-band text-band-ink">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 pt-10 pb-28 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:pb-12">
        <div>
          <div className="flex items-center gap-4">
            <Logo r={ajustes} className="size-16" />
            <div>
              <p className="font-display text-3xl leading-none font-extrabold tracking-tight">{ajustes.name}</p>
              {ajustes.tagline && <p className="mt-1.5 text-band-soft">{ajustes.tagline}</p>}
            </div>
          </div>
          <BotonesContacto ajustes={ajustes} className="mt-6 [&_.btn]:bg-surface-2 [&_.btn]:text-[#1e1a17]" />
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
      <div className="mx-auto flex w-full max-w-6xl flex-wrap justify-between gap-x-6 gap-y-2 border-t border-white/10 px-4 py-4 text-xs text-band-soft">
        <p>
          © {new Date().getFullYear()} {ajustes.name}
        </p>
        <span className="flex gap-5">
          {ajustes.mod_reservations && (
            <Link href="/reservar" className="underline underline-offset-4 hover:text-band-ink">
              Reservar mesa
            </Link>
          )}
          <Link href="/privacidad" className="underline underline-offset-4 hover:text-band-ink">
            Política de privacidad
          </Link>
        </span>
      </div>
    </footer>
  );
}
