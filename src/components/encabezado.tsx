import Link from "next/link";
import { NEGOCIO } from "@/lib/negocio";

export function Encabezado({ children }: { children?: React.ReactNode }) {
  return (
    <header className="relative z-20 border-b-2 border-outline bg-bg pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/" className="font-display text-xl font-extrabold tracking-tight">
          {NEGOCIO.nombre}
        </Link>
        {children}
      </div>
    </header>
  );
}
