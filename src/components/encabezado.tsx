import Link from "next/link";
import { obtenerAjustes } from "@/lib/menu";
import { LogoCasa } from "@/components/logo-casa";

/** Encabezado del sitio del cliente: logo (o monograma) y el nombre del restaurante, con enlaces finos. */
export async function Encabezado({
  children,
  debajoDeBarra = false,
}: {
  children?: React.ReactNode;
  debajoDeBarra?: boolean;
}) {
  const r = await obtenerAjustes();
  return (
    <header className={`relative z-20 border-b border-line bg-bg ${debajoDeBarra ? "" : "pt-[env(safe-area-inset-top)]"}`}>
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 md:h-20">
        <Link href="/" className="group flex min-w-0 items-center gap-3" aria-label={`${r.name}, ir al menú`}>
          <Logo r={r} className="size-10 md:size-12" />
          <span className="truncate font-display text-2xl leading-none tracking-wide uppercase md:text-[1.75rem]">
            {r.name}
          </span>
        </Link>
        {children ?? (
          <nav aria-label="Principal" className="flex shrink-0 items-center gap-6 text-[13px] font-medium tracking-[0.18em] uppercase">
            <Link href="/#menu" className="hidden underline-offset-8 hover:underline sm:inline">
              Menú
            </Link>
            {r.mod_reservations && (
              <Link
                href="/reservar"
                className="inline-flex min-h-10 items-center rounded-md border border-ink px-3.5 transition-colors hover:bg-ink hover:text-bg"
              >
                Reservar
              </Link>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}

/** Logo subido en Ajustes si lo hay; si no, el emblema de la casa (gorro y cubiertos). */
export function Logo({
  r,
  className = "size-10",
}: {
  r: { logo_url: string | null; name: string };
  className?: string;
}) {
  if (r.logo_url)
    return (
      // Logo externo (p. ej. subido a Supabase Storage): <img> simple para aceptar cualquier origen
      // eslint-disable-next-line @next/next/no-img-element
      <img src={r.logo_url} alt="" className={`shrink-0 object-contain ${className}`} />
    );
  return (
    <LogoCasa
      nombre={r.name}
      className={`shrink-0 transition-transform duration-200 ease-[var(--ease-out)] group-active:scale-95 ${className}`}
    />
  );
}
