import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { obtenerAjustes } from "@/lib/menu";
import { urlSitio } from "@/lib/sitio";
import "./globals.css";

const titulo = Bricolage_Grotesque({
  variable: "--font-titulo",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const cuerpo = Figtree({
  variable: "--font-cuerpo",
  subsets: ["latin"],
});

/** Título, descripción e imagen para buscadores y WhatsApp, con los datos del restaurante visitado. */
export async function generateMetadata(): Promise<Metadata> {
  const r = await obtenerAjustes();
  const lema = r.tagline ?? "Pide a domicilio";
  return {
    metadataBase: new URL(r.domain ? `https://${r.domain}` : urlSitio()),
    title: { default: `${r.name} · Pide a domicilio`, template: `%s · ${r.name}` },
    description: `${lema}. Pide en línea y sigue tu pedido en tiempo real.`,
    openGraph: {
      title: `${r.name} · Pide a domicilio`,
      description: lema,
      images: [r.logo_url ?? `/${r.mascot}/libreta.png`],
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0f5132" },
    { media: "(prefers-color-scheme: dark)", color: "#08261a" },
  ],
};

// Colores por defecto (paleta "Verde selva"). Si un restaurante configura otros, se sobrescriben aquí.
// También cuentan como "por defecto" los de la paleta anterior, para que los restaurantes que nunca
// los cambiaron reciban la nueva sin tener que tocar la base de datos.
const POR_DEFECTO = {
  brand: ["#f28c28", "#ee9a4d"],
  accent: ["#1d7046", "#2e6a4e"],
  band: ["#0f5132", "#2b1d15"],
};
const HEX = /^#[0-9a-fA-F]{6}$/;
const propio = (valor: string, defecto: string[]) => HEX.test(valor) && !defecto.includes(valor.toLowerCase());

function coloresDelRestaurante(r: { color_brand: string; color_accent: string; color_band: string }) {
  const reglas: string[] = [];
  if (propio(r.color_brand, POR_DEFECTO.brand))
    reglas.push(
      `--brand:${r.color_brand}`,
      `--brand-strong:color-mix(in oklab, ${r.color_brand} 82%, black)`,
    );
  if (propio(r.color_accent, POR_DEFECTO.accent)) reglas.push(`--hoja:${r.color_accent}`, `--ok:${r.color_accent}`);
  if (propio(r.color_band, POR_DEFECTO.band)) reglas.push(`--band:${r.color_band}`);
  // Se repite para modo oscuro, que también define estas variables
  return reglas.length ? `:root,:root:not(#_){${reglas.join(";")}}` : null;
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const r = await obtenerAjustes();
  const colores = coloresDelRestaurante(r);
  return (
    <html lang="es-CO" className={`${titulo.variable} ${cuerpo.variable} antialiased`}>
      <head>{colores && <style>{colores}</style>}</head>
      <body className="flex min-h-dvh flex-col font-sans">{children}</body>
    </html>
  );
}
