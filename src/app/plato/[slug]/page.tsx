import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BarraInfo } from "@/components/barra-info";
import { Encabezado } from "@/components/encabezado";
import { AvisoDemo } from "@/components/aviso-demo";
import { Pie } from "@/components/pie";
import { CarritoMovil } from "@/components/carrito/carrito-movil";
import { DesplazamientoSuave } from "@/components/desplazamiento-suave";
import { obtenerMenu } from "@/lib/menu";
import { buscarPlato, detalleDePlato, fotoDePlato, slugPlato } from "@/lib/platos";
import { FichaPlato, type PlatoOtro } from "./ficha";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { categorias } = await obtenerMenu();
  const plato = buscarPlato(categorias, slug);
  if (!plato) return { title: "Plato no encontrado" };
  return {
    title: plato.name,
    description: plato.description ?? `${plato.name}, hecho en casa. Pide en línea.`,
    openGraph: { images: fotoDePlato(plato) ? [fotoDePlato(plato)!] : undefined },
  };
}

/** Ficha de un plato: el nombre en grande, la foto protagonista, qué trae y el botón para pedirlo. */
export default async function Plato({ params }: Props) {
  const { slug } = await params;
  const { categorias, ajustes } = await obtenerMenu();
  const plato = buscarPlato(categorias, slug);
  if (!plato) notFound();

  // Otros platos: primero los de la misma categoría, después los demás
  const otros: PlatoOtro[] = categorias
    .flatMap((c) => c.products.map((p) => ({ p, c })))
    .filter(({ p }) => p.id !== plato.id)
    .sort((a, b) => Number(b.c.id === plato.categoria.id) - Number(a.c.id === plato.categoria.id))
    .slice(0, 8)
    .map(({ p, c }) => ({
      id: p.id,
      nombre: p.name,
      precio: p.price,
      foto: fotoDePlato(p),
      slug: slugPlato(p.name),
      categoriaSlug: c.slug,
    }));

  return (
    <>
      <DesplazamientoSuave />
      <BarraInfo ajustes={ajustes} />
      <Encabezado debajoDeBarra />
      <AvisoDemo ajustes={ajustes} />
      <FichaPlato
        plato={{
          id: plato.id,
          nombre: plato.name,
          descripcion: plato.description,
          precio: plato.price,
          etiqueta: plato.badge,
          foto: fotoDePlato(plato),
          categoria: plato.categoria.name,
          categoriaSlug: plato.categoria.slug,
          ...detalleDePlato(plato.name),
        }}
        otros={otros}
      />
      <Pie ajustes={ajustes} />
      <CarritoMovil ajustes={ajustes} />
    </>
  );
}
