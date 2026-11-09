import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Páginas con datos en vivo (pedido, cocina): usamos el modo clásico de renderizado.
  cacheComponents: false,
  poweredByHeader: false,
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
