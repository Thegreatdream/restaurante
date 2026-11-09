import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { NEGOCIO } from "@/lib/negocio";
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

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITIO_URL ?? "http://localhost:3000"),
  title: { default: `${NEGOCIO.nombre} · Pide a domicilio`, template: `%s · ${NEGOCIO.nombre}` },
  description: `${NEGOCIO.lema}. Pide en línea y sigue tu pedido en tiempo real.`,
  openGraph: {
    title: `${NEGOCIO.nombre} · Pide a domicilio`,
    description: NEGOCIO.lema,
    images: ["/tato/libreta.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fff8ec" },
    { media: "(prefers-color-scheme: dark)", color: "#17110d" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CO" className={`${titulo.variable} ${cuerpo.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col font-sans">{children}</body>
    </html>
  );
}
