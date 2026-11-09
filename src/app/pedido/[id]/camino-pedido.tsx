import { Check } from "@/components/iconos";

/** Motico con el mismo trazo grueso de los iconos de categorías. Mira hacia la derecha: hacia donde avanza. */
function Moto({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <circle cx="8" cy="22" r="4" fill="#fff8ec" />
      <circle cx="24.5" cy="22" r="4" fill="#fff8ec" />
      <path d="M8 22h9l4-8h-5" />
      <path d="M21 14l3.5 8" />
      <path d="M22 9h3l-2 5" />
      <path d="M12 14h-5l-1.5 4" />
    </svg>
  );
}

const PASOS = ["Recibido", "Preparando", "En camino"] as const;

/**
 * Camino del pedido: una pista con tres paradas y una motico que avanza solo cuando el estado cambia.
 * La pista se llena en verde hoja. Todo se mueve con transform (suave incluso en celulares modestos).
 */
export function CaminoPedido({ indice }: { indice: number }) {
  const progreso = Math.max(0, Math.min(indice, 2)) / 2; // 0, 0.5 o 1
  const llego = indice >= 2;

  return (
    <div className="border-t-2 border-outline bg-surface px-7 pt-5 pb-4 sm:px-10">
      <p className="sr-only">
        Paso {indice + 1} de 3: {PASOS[indice]}
      </p>
      <div aria-hidden className="relative h-12">
        {/* Pista vacía y pista llena */}
        <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-line" />
        <div
          className="camino-relleno absolute inset-x-0 top-1/2 h-2 rounded-full bg-hoja"
          style={{ transform: `translateY(-50%) scaleX(${progreso})` }}
        />

        {/* Paradas */}
        {PASOS.map((paso, i) => {
          const hecho = i < indice || (llego && i === 2);
          return (
            <span
              key={paso}
              className={`absolute top-1/2 grid size-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 transition-colors duration-500 ${
                hecho ? "border-outline bg-hoja text-white" : i === indice ? "border-outline bg-surface" : "border-line bg-surface"
              }`}
              style={{ left: `${i * 50}%` }}
            >
              {hecho && <Check className="size-3" />}
            </span>
          );
        })}

        {/* La motico: avanza sobre el ancho de la pista (unidades del contenedor) */}
        <div className="absolute inset-0 [container-type:inline-size]">
          <span
            className="camino-moto absolute top-1/2 left-0 grid size-12 place-items-center rounded-full border-2 border-outline bg-brand text-[#1e1a17] shadow-[2px_2px_0_var(--shadow)]"
            style={{ transform: `translate(calc(${progreso} * 100cqw - 50%), -50%)` }}
          >
            <span className={llego ? "moto-andando" : ""}>
              <Moto className="size-7" />
            </span>
          </span>
        </div>
      </div>

      <ol className="mt-2 grid grid-cols-3 text-xs font-bold" aria-label="Avance del pedido">
        {PASOS.map((paso, i) => (
          <li
            key={paso}
            aria-current={i === indice ? "step" : undefined}
            className={`${i === 0 ? "text-left" : i === 1 ? "text-center" : "text-right"} ${
              i <= indice ? "text-ink" : "text-ink-soft"
            } -mx-4`}
          >
            {paso}
          </li>
        ))}
      </ol>
    </div>
  );
}
