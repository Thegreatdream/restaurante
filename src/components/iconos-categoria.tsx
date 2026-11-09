/**
 * Iconos de categoría dibujados a mano en SVG, con trazo grueso y redondeado
 * para que hablen el mismo idioma que el contorno de Tato.
 * Se eligen por el "slug" de la categoría; si no hay uno propio, sale el cubierto.
 */
type P = { className?: string };

const base = {
  viewBox: "0 0 32 32",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.25,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

// Plato humeante con cubiertos
const Plato = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M5 19h22a11 6.5 0 0 1-22 0Z" fill="var(--icono-relleno)" />
    <path d="M3.5 19h25" />
    <path d="M12 9c-1-1.5 1-2.5 0-4M16 10c-1-1.5 1-2.5 0-4M20 9c-1-1.5 1-2.5 0-4" />
  </svg>
);

const Hamburguesa = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M6 14a10 7 0 0 1 20 0Z" fill="var(--icono-relleno)" />
    <path d="M12 9.5h.01M16 8h.01M20 9.5h.01" strokeWidth={2.8} />
    <path d="M5 18.5c2-1.6 3.5 1.6 5.5 0s3.5 1.6 5.5 0 3.5 1.6 5.5 0 3.5 1.6 5.5 0" />
    <path d="M6 22h20a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3Z" fill="var(--icono-relleno)" />
  </svg>
);

const Papas = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M11 13 10 5M15 12V4M19 12l1-7M22.5 13.5l2.5-6" />
    <path d="M7.5 13h17l-2 14h-13Z" fill="var(--icono-relleno)" />
    <path d="M12 19a4 3 0 0 0 8 0" />
  </svg>
);

const Bebida = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M17 9l3-6 4 1" />
    <path d="M8 9h16l-2 18H10Z" fill="var(--icono-relleno)" />
    <path d="M9 15h14" />
  </svg>
);

const Postre = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M5 25V16l20-6v15Z" fill="var(--icono-relleno)" />
    <path d="M5 19.5l20-5" />
    <path d="M5 25h20" />
    <circle cx="23" cy="6.5" r="2.5" />
  </svg>
);

const Cubiertos = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M10 4v8a3 3 0 0 0 6 0V4M13 4v24" />
    <path d="M22 28V4c-3 2-4 6-4 10h4" />
  </svg>
);

const POR_SLUG: Record<string, (p: P) => React.ReactElement> = {
  "platos-del-dia": Plato,
  hamburguesas: Hamburguesa,
  acompanantes: Papas,
  bebidas: Bebida,
  postres: Postre,
};

export function IconoCategoria({ slug, className = "size-5" }: { slug: string; className?: string }) {
  const Icono = POR_SLUG[slug] ?? Cubiertos;
  return <Icono className={className} />;
}
