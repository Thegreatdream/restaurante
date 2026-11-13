import type { MetadataRoute } from "next";
import { obtenerMenu } from "@/lib/menu";
import { rutaPlato } from "@/lib/platos";
import { urlSitio } from "@/lib/sitio";

/** Las páginas públicas del restaurante (incluida la ficha de cada plato), para que Google las encuentre. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { ajustes: r, categorias, demo } = await obtenerMenu();
  const sitio = r.domain ? `https://${r.domain}` : urlSitio();
  const platos = demo
    ? []
    : categorias.flatMap((c) =>
        c.products.map((p) => ({ url: `${sitio}${rutaPlato(p.name)}`, changeFrequency: "weekly" as const, priority: 0.6 })),
      );
  return [
    { url: sitio, changeFrequency: "daily", priority: 1 },
    ...platos,
    ...(r.mod_reservations ? [{ url: `${sitio}/reservar`, changeFrequency: "weekly" as const, priority: 0.7 }] : []),
    { url: `${sitio}/privacidad`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
