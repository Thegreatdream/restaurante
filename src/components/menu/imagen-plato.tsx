import Image from "next/image";
import { IconoCategoria } from "@/components/iconos-categoria";

/** Color del dibujo según la categoría (todos salen de la paleta de Tato). */
const FONDO: Record<string, string> = {
  "platos-del-dia": "bg-brand text-[#1e1a17] [--icono-relleno:#fff8ec]",
  hamburguesas: "bg-coral text-[#1e1a17] [--icono-relleno:#fbefc4]",
  acompanantes: "bg-surface-2 text-ink [--icono-relleno:var(--brand)]",
  bebidas: "bg-coral-soft text-ink [--icono-relleno:var(--surface)]",
  postres: "bg-brand-strong text-[#1e1a17] [--icono-relleno:#fde3da]",
};

/**
 * La foto del plato si existe; si no, un dibujo de su categoría sobre un fondo con ramitas.
 * Así la web se ve terminada hoy y mejora sola cuando se suban las fotos.
 */
export function ImagenPlato({
  slug,
  nombre,
  imagen,
  sizes,
  className = "",
  iconoClassName = "size-[42%]",
}: {
  slug: string;
  nombre: string;
  imagen?: string | null;
  sizes: string;
  className?: string;
  iconoClassName?: string;
}) {
  return (
    <div className={`marco-foto relative overflow-hidden ${className}`}>
      {imagen ? (
        <Image src={imagen} alt={nombre} fill sizes={sizes} className="object-cover" />
      ) : (
        <div className={`patron-panel grid size-full place-items-center ${FONDO[slug] ?? FONDO["platos-del-dia"]}`}>
          <IconoCategoria slug={slug} className={iconoClassName} />
        </div>
      )}
    </div>
  );
}
