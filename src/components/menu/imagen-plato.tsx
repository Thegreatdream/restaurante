import Image from "next/image";
import { IconoCategoria } from "@/components/iconos-categoria";

/**
 * La foto del plato si existe; si no, un recuadro de lino con el dibujo de su categoría en trazo suave.
 * Así la web se ve terminada hoy y mejora sola cuando se suban las fotos.
 */
export function ImagenPlato({
  slug,
  nombre,
  imagen,
  sizes,
  className = "",
  iconoClassName = "size-[34%]",
}: {
  slug: string;
  nombre: string;
  imagen?: string | null;
  sizes: string;
  className?: string;
  iconoClassName?: string;
}) {
  return (
    <div className={`marco-foto relative overflow-hidden bg-surface-2 ${className}`}>
      {imagen ? (
        <Image src={imagen} alt={nombre} fill sizes={sizes} className="object-cover" />
      ) : (
        <div className="grid size-full place-items-center text-ink-soft/55 [--icono-relleno:transparent] [&_svg]:[stroke-width:1.3]">
          <IconoCategoria slug={slug} className={iconoClassName} />
        </div>
      )}
    </div>
  );
}
