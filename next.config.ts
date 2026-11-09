import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Páginas con datos en vivo (pedido, cocina): usamos el modo clásico de renderizado.
  cacheComponents: false,
  poweredByHeader: false,
  // Fotos de los platos guardadas en Supabase Storage
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" }],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
