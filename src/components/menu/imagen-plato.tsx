import Image from "next/image";
import { IconoCategoria } from "@/components/iconos-categoria";

/**
 * Color del dibujo según la categoría. Solo tres fondos que se alternan
 * (naranja de Tato, verde hoja suave y crema) para que el menú se vea ordenado.
 */
const NARANJA = "bg-brand text-[#1e1a17] [--icono-relleno:#fff8ec]";
const VERDE = "bg-hoja-soft text-ink [--icono-relleno:var(--brand)]";
const CREMA = "bg-surface-2 text-ink [--icono-relleno:var(--hoja-soft)]";
const FONDO: Record<string, string> = {
  "platos-del-dia": NARANJA,
  hamburguesas: VERDE,
  acompanantes: CREMA,
  bebidas: VERDE,
  postres: NARANJA,
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
        <div className={`patron-panel grid size-full place-items-center ${FONDO[slug] ?? NARANJA}`}>
          <IconoCategoria slug={slug} className={iconoClassName} />
        </div>
      )}
    </div>
  );
}
