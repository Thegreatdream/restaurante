/**
 * Enlace de WhatsApp con el mensaje ya escrito.
 * Con celular colombiano de 10 dígitos abre el chat de esa persona; sin celular, deja elegir el chat o grupo.
 */
export function enlaceWhatsapp(texto: string, celular?: string | null): string {
  const numero = celular ? (/^3\d{9}$/.test(celular) ? `57${celular}` : celular.replace(/\D/g, "")) : "";
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

/** Abre la dirección en Google Maps (búsqueda), sin necesidad de claves. */
export function enlaceMapa(direccion: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;
}
