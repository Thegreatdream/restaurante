import type { Ajustes } from "@/lib/tipos";

/** Franja visible en todas las páginas del cliente cuando el restaurante está en modo demostración. */
export function AvisoDemo({ ajustes }: { ajustes: Ajustes }) {
  if (!ajustes.demo_mode) return null;
  return (
    <p className="relative z-10 border-b-2 border-outline bg-brand px-4 py-2 text-center text-[13px] font-bold text-[#1e1a17]">
      Restaurante de demostración: los pedidos no son reales.
    </p>
  );
}
