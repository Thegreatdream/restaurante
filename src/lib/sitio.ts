/**
 * Dirección pública de la web, sin "/" al final.
 * En Vercel se toma sola (VERCEL_PROJECT_PRODUCTION_URL); en el computador usa NEXT_PUBLIC_SITIO_URL.
 * Si algún día usas un dominio propio, ponlo en SITIO_URL y gana sobre los demás.
 */
export function urlSitio(): string {
  const propia = process.env.SITIO_URL;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const local = process.env.NEXT_PUBLIC_SITIO_URL;
  const url = propia || (vercel ? `https://${vercel}` : local) || "http://localhost:3000";
  return url.replace(/\/$/, "");
}

/**
 * Dirección pública de un restaurante para armar links (QR, entregas, domiciliarios):
 * su dominio propio si lo tiene; si no, la dirección con la que se abrió la página.
 */
export async function urlPublica(r: { domain: string | null }): Promise<string> {
  if (r.domain) return `https://${r.domain}`;
  const { headers } = await import("next/headers");
  const host = (await headers()).get("host") ?? "";
  if (!host) return urlSitio();
  return `${host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https"}://${host}`;
}
