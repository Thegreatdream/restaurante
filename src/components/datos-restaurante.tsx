import type { Ajustes, Categoria } from "@/lib/tipos";
import { urlSitio } from "@/lib/sitio";

const DIAS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Datos estructurados del restaurante (JSON-LD) para que Google muestre bien el negocio:
 * nombre, dirección, teléfono, horario y la carta. Todo sale de Ajustes y del menú;
 * lo que esté vacío simplemente no se incluye.
 */
export function DatosRestaurante({ ajustes: a, categorias }: { ajustes: Ajustes; categorias: Categoria[] }) {
  const sitio = a.domain ? `https://${a.domain}` : urlSitio();
  const redes = [
    a.instagram && `https://instagram.com/${a.instagram}`,
    a.facebook && `https://facebook.com/${a.facebook}`,
    a.tiktok && `https://tiktok.com/@${a.tiktok}`,
  ].filter(Boolean);
  const telefono = a.phone ? `+57${a.phone}` : a.whatsapp ? `+${a.whatsapp}` : undefined;

  const datos = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: a.name,
    url: sitio,
    description: a.tagline ?? undefined,
    image: a.logo_url ?? `${sitio}/opengraph-image`,
    servesCuisine: "Comida casera colombiana",
    priceRange: "$",
    currenciesAccepted: "COP",
    paymentAccepted: "Efectivo, transferencia",
    telephone: telefono,
    address: a.address ? { "@type": "PostalAddress", streetAddress: a.address, addressCountry: "CO" } : undefined,
    hasMap: a.maps_url ?? undefined,
    sameAs: redes.length ? redes : undefined,
    acceptsReservations: a.mod_reservations ? `${sitio}/reservar` : undefined,
    openingHoursSpecification: a.horario.map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: DIAS[h.weekday],
      opens: h.opens.slice(0, 5),
      closes: h.closes.slice(0, 5),
    })),
    potentialAction: {
      "@type": "OrderAction",
      target: sitio,
      deliveryMethod: [
        ...(a.mod_delivery ? ["http://purl.org/goodrelations/v1#DeliveryModeOwnFleet"] : []),
        ...(a.mod_pickup ? ["http://purl.org/goodrelations/v1#DeliveryModePickUp"] : []),
      ],
    },
    hasMenu: categorias.length
      ? {
          "@type": "Menu",
          url: `${sitio}/#menu`,
          hasMenuSection: categorias.map((c) => ({
            "@type": "MenuSection",
            name: c.name,
            hasMenuItem: c.products.map((p) => ({
              "@type": "MenuItem",
              name: p.name,
              description: p.description ?? undefined,
              image: p.image_url ?? undefined,
              offers: { "@type": "Offer", price: p.price, priceCurrency: "COP" },
            })),
          })),
        }
      : undefined,
  };

  return (
    <script
      type="application/ld+json"
      // Datos, no código: se escapa "<" para que ningún texto del menú pueda cerrar la etiqueta.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(datos).replace(/</g, "\\u003c") }}
    />
  );
}
