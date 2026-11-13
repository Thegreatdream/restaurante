import type { Categoria, Producto } from "@/lib/tipos";

/** "Bandeja de la casa" → "bandeja-de-la-casa" (dirección de la ficha del plato). */
export function slugPlato(nombre: string) {
  return (
    nombre
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "plato"
  );
}

export function rutaPlato(nombre: string) {
  return `/plato/${slugPlato(nombre)}`;
}

export type PlatoConCategoria = Producto & { categoria: Pick<Categoria, "id" | "name" | "slug"> };

/** Busca un plato del menú publicado por su dirección. */
export function buscarPlato(categorias: Categoria[], slug: string): PlatoConCategoria | null {
  for (const c of categorias)
    for (const p of c.products)
      if (slugPlato(p.name) === slug) return { ...p, categoria: { id: c.id, name: c.name, slug: c.slug } };
  return null;
}

/**
 * Fotos de muestra (hechas con IA) mientras el restaurante sube las suyas desde Panel → Menú.
 * Solo se usan cuando el plato no tiene foto propia. Hay que cambiarlas por fotos reales antes de vender.
 */
const FOTOS_MUESTRA: Record<string, string> = {
  "bandeja-de-la-casa": "/platos-muestra/bandeja-recortada.webp",
};

export function fotoDePlato(p: { name: string; image_url?: string | null }): string | null {
  return p.image_url || FOTOS_MUESTRA[slugPlato(p.name)] || null;
}

/**
 * Fotos "recortadas": el plato solo, con fondo transparente (terminan en "-recortada.webp").
 * Se muestran completas sobre el color de la página, sin cortarlas, como un producto flotando.
 */
export function esFotoRecortada(src: string | null | undefined) {
  return Boolean(src && /-recortada\.(webp|png)(\?|$)/.test(src));
}

/** Textos extra de la ficha. Si un plato no tiene, la ficha muestra solo su descripción. */
type Detalle = { idealPara?: string; porcion?: string; lema?: string };
const DETALLES: Record<string, Detalle> = {
  "bandeja-de-la-casa": {
    lema: "El almuerzo completo, como en la casa de la abuela.",
    idealPara: "El hambre grande del mediodía. Para compartir el chicharrón, si te dejan.",
    porcion: "Plato grande. Una persona con buen apetito.",
  },
};

export function detalleDePlato(nombre: string): Detalle {
  return DETALLES[slugPlato(nombre)] ?? {};
}
