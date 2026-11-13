import Link from "next/link";
import { cop, resumenHorario } from "@/lib/formato";
import type { Ajustes } from "@/lib/tipos";
import { BotonesContacto, redesDe, telefonoVisible } from "@/components/contacto";
import { Logo } from "@/components/encabezado";
import { LogoCasa } from "@/components/logo-casa";

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
    <footer className="pb-safe mt-auto bg-band text-band-ink">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 pt-16 pb-28 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:pb-16">
        <div>
          {ajustes.logo_url ? (
            <div className="flex items-center gap-4">
              <Logo r={ajustes} className="size-14" />
              <p className="font-display text-4xl leading-none tracking-wide uppercase">{ajustes.name}</p>
            </div>
          ) : (
            <LogoCasa nombre={ajustes.name} variante="sello" className="size-40" />
          )}
          {ajustes.tagline && <p className="mt-5 font-light text-band-soft">{ajustes.tagline}</p>}
          <BotonesContacto
            ajustes={ajustes}
            className="mt-8 [&_.btn]:border-band-ink/50 [&_.btn]:bg-transparent [&_.btn]:text-band-ink [&_.btn:hover]:!bg-band-ink [&_.btn:hover]:!text-band"
          />
        </div>
        <dl className="grid gap-x-10 gap-y-6 text-[15px] sm:grid-cols-2">
          {datos.map(([k, v]) => (
            <div key={k}>
              <dt className="antetitulo text-[11px] text-band-soft">{k}</dt>
              <dd className="mt-1.5 font-light">{v}</dd>
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
