/**
 * Logo de la casa, dibujado en SVG (nítido en cualquier tamaño).
 * Sello verde con aro dorado: gorro de chef al frente y tenedor y cuchillo cruzados detrás.
 *
 * - "marca": solo el emblema en su círculo, con trazo grueso para que se lea a 24–64 px (encabezado, ícono).
 * - "sello": la versión completa con doble aro, "Tradición" y "Almuerzos caseros" en curva y el nombre
 *   al centro (pie de página, redes, impresos).
 *
 * Los textos usan la letra de títulos del sitio (Cormorant Garamond).
 */
const VERDE = "#1f2d28";
const ORO = "#c9a24a";
const MARFIL = "#efe6d2";
const LETRA = { fontFamily: "var(--font-titulo), 'Cormorant Garamond', Georgia, serif" };

/** Gorro y cubiertos con detalle fino: para tamaños grandes. */
function Emblema() {
  return (
    <g fill="none" stroke={ORO} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
      <g transform="translate(200 135) rotate(-42)">
        <path d="M-9 -80V-58M-3 -80V-58M3 -80V-58M9 -80V-58" />
        <path d="M-9 -60Q-9 -42 0 -40Q9 -42 9 -60" />
        <rect x={-4} y={-38} width={8} height={118} rx={4} />
      </g>
      <g transform="translate(200 135) rotate(42)">
        <path d="M-4 -80C8 -66 8 -36 6 -12H-6V-74Q-6 -79 -4 -80Z" />
        <rect x={-4.5} y={-6} width={9} height={86} rx={4.5} />
      </g>
      <path
        fill={VERDE}
        d="M172 152V128C158 126 152 110 160 100C166 92 176 92 182 96C184 84 192 78 200 78C208 78 216 84 218 96C224 92 234 92 240 100C248 110 242 126 228 128V152Z"
      />
      <path strokeWidth={2.4} d="M172 140H228M188 118V130M200 114V130M212 118V130" />
    </g>
  );
}

/** Gorro y cubiertos simplificados, trazo grueso: para tamaños pequeños. */
function EmblemaChico() {
  return (
    <g fill="none" stroke={ORO} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round">
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
  );
}

/** "Don Gabriel" → ["DON", "GABRIEL"]: la primera palabra pequeña encima, el resto grande. */
function partirNombre(nombre: string): [string | null, string] {
  const palabras = nombre.trim().toUpperCase().split(/\s+/);
  if (palabras.length < 2) return [null, palabras[0] ?? ""];
  return [palabras[0]!, palabras.slice(1).join(" ")];
}

export function LogoCasa({
  nombre,
  variante = "marca",
  className = "",
}: {
  nombre: string;
  variante?: "marca" | "sello";
  className?: string;
}) {
  if (variante === "marca")
    return (
      <svg viewBox="0 0 400 400" className={className} aria-hidden>
        <circle cx={200} cy={200} r={198} fill={VERDE} />
        <circle cx={200} cy={200} r={178} fill="none" stroke={ORO} strokeWidth={10} />
        <g transform="translate(200 202) scale(1.32) translate(-200 -136)">
          <EmblemaChico />
        </g>
      </svg>
    );

  const [arriba, principal] = partirNombre(nombre);
  const tamano = principal.length > 9 ? Math.max(30, Math.round(50 * (9 / principal.length))) : 50;
  return (
    <svg viewBox="0 0 400 400" className={className} role="img" aria-label={`Logo de ${nombre}`}>
      <defs>
        <path id="sello-arco-arriba" d="M38 200A162 162 0 0 1 362 200" />
        <path id="sello-arco-abajo" d="M26 200A174 174 0 0 0 374 200" />
      </defs>
      <circle cx={200} cy={200} r={198} fill={VERDE} />
      <circle cx={200} cy={200} r={188} fill="none" stroke={ORO} strokeWidth={1.6} />
      <circle cx={200} cy={200} r={150} fill="none" stroke={ORO} strokeWidth={1.6} />
      <g fill={ORO} fontWeight={600} fontSize={16} letterSpacing={7} textAnchor="middle" style={LETRA}>
        <text>
          <textPath href="#sello-arco-arriba" startOffset="50%">
            TRADICIÓN
          </textPath>
        </text>
        <text>
          <textPath href="#sello-arco-abajo" startOffset="50%">
            ALMUERZOS CASEROS
          </textPath>
        </text>
      </g>
      <circle cx={31} cy={200} r={3} fill={ORO} />
      <circle cx={369} cy={200} r={3} fill={ORO} />
      <g transform="translate(200 140) scale(0.9) translate(-200 -135)">
        <Emblema />
      </g>
      <g fill={MARFIL} textAnchor="middle" fontWeight={600} style={LETRA}>
        {arriba && (
          <text x={200} y={230} fontSize={17} letterSpacing={9}>
            {arriba}
          </text>
        )}
        <text x={200} y={274} fontSize={tamano} letterSpacing={3}>
          {principal}
        </text>
      </g>
      <g stroke={ORO} strokeWidth={1.4}>
        <line x1={150} y1={296} x2={190} y2={296} />
        <line x1={210} y1={296} x2={250} y2={296} />
      </g>
      <path d="M200 291L205 296L200 301L195 296Z" fill={ORO} />
    </svg>
  );
}
