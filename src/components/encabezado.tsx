import Image from "next/image";
import Link from "next/link";
import { NEGOCIO } from "@/lib/negocio";

export function Encabezado({ children }: { children?: React.ReactNode }) {
  return (
    <header className="relative z-20 border-b-2 border-outline bg-bg pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/" className="group flex items-center gap-2.5" aria-label={`${NEGOCIO.nombre}, ir al menú`}>
          <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-outline bg-surface-2 transition-transform duration-200 ease-[var(--ease-out)] group-active:scale-95">
            <Image src="/tato/cara.png" alt="" width={192} height={192} className="mt-1 size-full object-cover" priority />
          </span>
          <span className="font-display text-xl leading-none font-extrabold tracking-tight">{NEGOCIO.nombre}</span>
        </Link>
        {children}
      </div>
    </header>
  );
}
