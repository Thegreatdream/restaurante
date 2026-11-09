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
