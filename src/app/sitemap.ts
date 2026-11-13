import type { MetadataRoute } from "next";
import { obtenerAjustes } from "@/lib/menu";
import { urlSitio } from "@/lib/sitio";

/** Las páginas públicas del restaurante, para que Google las encuentre. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const r = await obtenerAjustes();
  const sitio = r.domain ? `https://${r.domain}` : urlSitio();
  return [
    { url: sitio, changeFrequency: "daily", priority: 1 },
    ...(r.mod_reservations ? [{ url: `${sitio}/reservar`, changeFrequency: "weekly" as const, priority: 0.7 }] : []),
    { url: `${sitio}/privacidad`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
