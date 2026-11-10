import Image from "next/image";
import Link from "next/link";
import { obtenerAjustes } from "@/lib/menu";

/** Encabezado del sitio del cliente: logo (o la cara de la mascota) y el nombre del restaurante. */
export async function Encabezado({
  children,
  debajoDeBarra = false,
}: {
  children?: React.ReactNode;
  debajoDeBarra?: boolean;
}) {
  const r = await obtenerAjustes();
  return (
    <header className={`relative z-20 border-b-2 border-outline bg-bg ${debajoDeBarra ? "" : "pt-[env(safe-area-inset-top)]"}`}>
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/" className="group flex min-w-0 items-center gap-2.5" aria-label={`${r.name}, ir al menú`}>
          <Logo r={r} className="size-10" />
          <span className="truncate font-display text-xl leading-none font-extrabold tracking-tight">{r.name}</span>
        </Link>
        {children}
      </div>
    </header>
  );
}

/** Logo del restaurante si lo tiene; si no, la cara de su mascota en un círculo. */
export function Logo({
  r,
  className = "size-10",
}: {
  r: { logo_url: string | null; mascot: string; name: string };
  className?: string;
}) {
  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full border-2 border-outline bg-surface-2 transition-transform duration-200 ease-[var(--ease-out)] group-active:scale-95 ${className}`}
    >
      {r.logo_url ? (
        // Logo externo (p. ej. subido a Supabase Storage): <img> simple para aceptar cualquier origen
        // eslint-disable-next-line @next/next/no-img-element
        <img src={r.logo_url} alt="" className="size-full object-cover" />
      ) : (
        <Image src={`/${r.mascot}/cara.png`} alt="" width={192} height={192} className="mt-1 size-full object-cover" priority />
      )}
    </span>
  );
}
