import { Check } from "@/components/iconos";

/** Motico con el mismo trazo grueso de los iconos de categorías. Mira hacia la derecha: hacia donde avanza. */
function Moto({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <circle cx="8" cy="22" r="4" fill="#f6fbf4" />
      <circle cx="24.5" cy="22" r="4" fill="#f6fbf4" />
      <path d="M8 22h9l4-8h-5" />
      <path d="M21 14l3.5 8" />
      <path d="M22 9h3l-2 5" />
      <path d="M12 14h-5l-1.5 4" />
    </svg>
  );
}

/** Bolsa de pedido (para recoger y mesa). */
function BolsaPedido({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <path d="M7 11h18l-1.5 15h-15Z" fill="#f6fbf4" />
      <path d="M12 11V9a4 4 0 0 1 8 0v2" />
      <path d="M12.5 18.5c1.5 2 5.5 2 7 0" />
    </svg>
  );
}

/**
 * Camino del pedido: una pista con sus paradas y un marcador (motico o bolsa) que avanza
 * solo cuando el estado cambia. La pista se llena en verde hoja. Todo se mueve con transform.
 */
export function CaminoPedido({
  indice,
  pasos,
  icono = "moto",
}: {
  indice: number;
  pasos: string[];
  icono?: "moto" | "bolsa";
}) {
  const ultimo = pasos.length - 1;
  const actual = Math.max(0, Math.min(indice, ultimo));
  const progreso = actual / ultimo;
  const llego = actual === ultimo;
  // La motico va dando saltitos mientras está en la calle (el paso antes de "entregado")
  const andando = icono === "moto" && actual === ultimo - 1;

  return (
    <div className="border-t-2 border-outline bg-surface px-7 pt-5 pb-4 sm:px-10">
      <p className="sr-only">
        Paso {actual + 1} de {pasos.length}: {pasos[actual]}
      </p>
      <div aria-hidden className="relative h-12">
        {/* Pista vacía y pista llena */}
        <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-line" />
        <div
          className="camino-relleno absolute inset-x-0 top-1/2 h-2 rounded-full bg-hoja"
          style={{ transform: `translateY(-50%) scaleX(${progreso})` }}
        />

        {/* Paradas */}
        {pasos.map((paso, i) => {
          const hecho = i < actual || (llego && i === ultimo);
          return (
            <span
              key={paso}
              className={`absolute top-1/2 grid size-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 transition-colors duration-500 ${
                hecho ? "border-outline bg-hoja text-white" : i === actual ? "border-outline bg-surface" : "border-line bg-surface"
              }`}
              style={{ left: `${(i / ultimo) * 100}%` }}
            >
              {hecho && <Check className="size-3" />}
            </span>
          );
        })}

        {/* El marcador avanza sobre el ancho de la pista (unidades del contenedor) */}
        <div className="absolute inset-0 [container-type:inline-size]">
          <span
            className={`camino-moto absolute top-1/2 left-0 grid size-12 place-items-center rounded-full border-2 border-outline text-[#1e1a17] shadow-[2px_2px_0_var(--shadow)] ${
              llego ? "bg-hoja text-white" : "bg-brand"
            }`}
            style={{ transform: `translate(calc(${progreso} * 100cqw - 50%), -50%)` }}
          >
            <span className={andando ? "moto-andando" : ""}>
              {llego ? <Check className="size-6" /> : icono === "moto" ? <Moto className="size-7" /> : <BolsaPedido className="size-7" />}
            </span>
          </span>
        </div>
      </div>

      {/* Nombres de cada parada, alineados bajo su punto */}
      <ol className="relative mt-2 h-4 text-xs font-bold" aria-label="Avance del pedido">
        {pasos.map((paso, i) => (
          <li
            key={paso}
            aria-current={i === actual ? "step" : undefined}
            className={`absolute top-0 whitespace-nowrap ${i <= actual ? "text-ink" : "text-ink-soft"}`}
            style={{
              left: `${(i / ultimo) * 100}%`,
              transform: i === 0 ? "translateX(-1rem)" : i === ultimo ? "translateX(calc(-100% + 1rem))" : "translateX(-50%)",
            }}
          >
            {paso}
          </li>
        ))}
      </ol>
    </div>
  );
}
