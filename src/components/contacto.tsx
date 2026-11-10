import type { Ajustes } from "@/lib/tipos";

type P = { className?: string };
const base = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.25,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const IconoWhatsapp = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M4 20l1.3-4A8 8 0 1 1 8 18.7Z" />
    <path d="M9.5 9.5c0 3 2 5 5 5l1-1.5-2-1-1 .8a3.5 3.5 0 0 1-2.3-2.3l.8-1-1-2Z" />
  </svg>
);
const IconoTelefono = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />
  </svg>
);
const IconoMapa = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);

/** Formato visible de un teléfono colombiano: 3001234567 → 300 123 4567; 6011234567 → 601 123 4567. */
export function telefonoVisible(n: string) {
  return n.replace(/^(\d{3})(\d{3})(\d{4})$/, "$1 $2 $3");
}

/** Botones de WhatsApp, llamar y cómo llegar. Solo aparecen los que están configurados. */
export function BotonesContacto({ ajustes, className = "" }: { ajustes: Ajustes; className?: string }) {
  const botones = [
    ajustes.whatsapp && { href: `https://wa.me/${ajustes.whatsapp}`, texto: "WhatsApp", Icono: IconoWhatsapp },
    ajustes.phone && { href: `tel:+57${ajustes.phone}`, texto: "Llamar", Icono: IconoTelefono },
    ajustes.maps_url && { href: ajustes.maps_url, texto: "Cómo llegar", Icono: IconoMapa },
  ].filter(Boolean) as { href: string; texto: string; Icono: (p: P) => React.ReactElement }[];

  if (!botones.length) return null;
  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      {botones.map(({ href, texto, Icono }) => (
        <a
          key={texto}
          href={href}
          target={href.startsWith("http") ? "_blank" : undefined}
          rel={href.startsWith("http") ? "noopener" : undefined}
          className="btn btn-ghost min-h-12 flex-1 px-4 text-[15px] sm:flex-none"
        >
          <Icono />
          {texto}
        </a>
      ))}
    </div>
  );
}

/** Enlaces a redes sociales configuradas. */
export function redesDe(a: Ajustes): { nombre: string; href: string; usuario: string }[] {
  return [
    a.instagram && { nombre: "Instagram", href: `https://instagram.com/${a.instagram}`, usuario: `@${a.instagram}` },
    a.facebook && { nombre: "Facebook", href: `https://facebook.com/${a.facebook}`, usuario: a.facebook },
    a.tiktok && { nombre: "TikTok", href: `https://tiktok.com/@${a.tiktok}`, usuario: `@${a.tiktok}` },
  ].filter(Boolean) as { nombre: string; href: string; usuario: string }[];
}
