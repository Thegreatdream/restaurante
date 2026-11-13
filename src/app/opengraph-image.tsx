import { ImageResponse } from "next/og";
import { obtenerAjustes } from "@/lib/menu";

/**
 * Imagen que aparece al compartir el enlace por WhatsApp o redes: el sello de la casa
 * sobre el verde de la marca, con el nombre del restaurante. Se genera sola con los datos de Ajustes.
 */
export const alt = "Almuerzos caseros a domicilio";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const VERDE = "#1c2b24";
const ORO = "#c9a24a";
const MARFIL = "#f4ecdc";

/** Letra de títulos del sitio (Cormorant Garamond). Si no se puede descargar, se usa la letra por defecto. */
async function letraTitulos(texto: string): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&text=${encodeURIComponent(texto)}`,
      { signal: AbortSignal.timeout(2500) },
    ).then((r) => r.text());
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    const r = await fetch(url, { signal: AbortSignal.timeout(2500) });
    return r.ok ? await r.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export default async function Image() {
  const r = await obtenerAjustes();
  const nombre = r.name.toUpperCase();
  const lema = r.tagline ?? "Almuerzos caseros, hechos cada día";
  const letra = await letraTitulos(`${nombre}${lema}ALMUERZOS CASEROS·`);
  const familia = letra ? "Titulos" : undefined;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: VERDE,
          padding: 28,
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            border: `2px solid ${ORO}`,
            color: MARFIL,
            fontFamily: familia,
            textAlign: "center",
            padding: "0 70px",
          }}
        >
          {/* Emblema de la casa: gorro de chef con tenedor y cuchillo cruzados */}
          <svg width="150" height="150" viewBox="0 0 400 400">
            <circle cx="200" cy="200" r="190" fill="none" stroke={ORO} strokeWidth="6" />
            <g transform="translate(200 202) scale(1.32) translate(-200 -136)" fill="none" stroke={ORO} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round">
              <g transform="translate(200 135) rotate(-42)">
                <path d="M-9 -80V-60M9 -80V-60" />
                <path d="M-9 -62Q-9 -44 0 -42Q9 -44 9 -62" />
                <path d="M0 -42V80" />
              </g>
              <g transform="translate(200 135) rotate(42)">
                <path fill={ORO} d="M-2 -80C10 -64 9 -34 6 -12H-6V-74Z" />
                <path d="M0 -6V80" />
              </g>
              <path
                fill={VERDE}
                d="M170 156V128C155 126 149 109 158 99C165 91 176 91 182 95C184 83 192 76 200 76C208 76 216 83 218 95C224 91 235 91 242 99C251 109 245 126 230 128V156Z"
              />
              <path d="M170 142H230" />
            </g>
          </svg>
          <div style={{ display: "flex", marginTop: 34, fontSize: 24, letterSpacing: 10, color: ORO }}>ALMUERZOS CASEROS</div>
          <div
            style={{
              display: "flex",
              marginTop: 14,
              fontSize: nombre.length > 14 ? 92 : 118,
              letterSpacing: 6,
              lineHeight: 1.05,
            }}
          >
            {nombre}
          </div>
          <div style={{ display: "flex", width: 90, height: 2, background: ORO, marginTop: 26 }} />
          <div style={{ display: "flex", marginTop: 26, fontSize: 34, color: "#d9d0bd" }}>{lema}</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: letra ? [{ name: "Titulos", data: letra, style: "normal", weight: 600 }] : undefined,
    },
  );
}
