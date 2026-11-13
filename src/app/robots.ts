import type { MetadataRoute } from "next";
import { obtenerAjustes } from "@/lib/menu";
import { urlSitio } from "@/lib/sitio";

/** Qué pueden leer los buscadores: la carta y las páginas públicas, nunca el panel ni los enlaces privados. */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const r = await obtenerAjustes();
  const sitio = r.domain ? `https://${r.domain}` : urlSitio();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/cocina", "/pedido/", "/mesa/", "/repartidor/", "/entrega/", "/reserva/", "/checkout"],
    },
    sitemap: `${sitio}/sitemap.xml`,
  };
}
