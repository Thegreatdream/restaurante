import Image from "next/image";

export type PoseTato =
  | "bienvenida" // saludando
  | "libreta"
  | "cocinando"
  | "moto"
  | "mesa" // va para tu mesa
  | "recoger" // listo para recoger
  | "celebrando" // entregado
  | "agradeciendo";

/**
 * Archivo de cada pose dentro de /public/<mascota>/. Mientras llegan las ilustraciones,
 * todas usan libreta.png con una animación distinta. Cuando llegue una pose nueva,
 * guárdala en la carpeta de la mascota y cambia solo su nombre de archivo aquí.
 */
const POSES: Record<PoseTato, { archivo: string; accion: string }> = {
  bienvenida: { archivo: "libreta.png", accion: "te da la bienvenida" },
  libreta: { archivo: "libreta.png", accion: "anota tu pedido en su libreta" },
  cocinando: { archivo: "libreta.png", accion: "cocina tu pedido" },
  moto: { archivo: "libreta.png", accion: "lleva tu pedido en moto" },
  mesa: { archivo: "libreta.png", accion: "lleva tu pedido a la mesa" },
  recoger: { archivo: "libreta.png", accion: "tiene tu pedido listo para recoger" },
  celebrando: { archivo: "libreta.png", accion: "celebra que tu pedido llegó" },
  agradeciendo: { archivo: "libreta.png", accion: "te da las gracias" },
};

// Tamaño real del archivo (todas las poses deben exportarse con la misma proporción).
const ANCHO = 576;
const ALTO = 1057;

export function Tato({
  pose,
  mascota = "tato",
  className = "",
  priority = false,
  sizes = "(min-width: 768px) 280px, 200px",
  quieto = false,
}: {
  pose: PoseTato;
  /** Carpeta de la mascota del restaurante en /public (por ahora solo "tato"). */
  mascota?: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
  /** Sin animación ni sombra: para apariciones pequeñas y secundarias. */
  quieto?: boolean;
}) {
  const { archivo, accion } = POSES[pose];
  const nombre = mascota === "tato" ? "Tato el castor" : "La mascota del restaurante";
  // El contenedor no fija su posición: quien lo usa decide (relative por defecto, o absolute).
  const posicion = /\b(absolute|fixed|sticky)\b/.test(className) ? "" : "relative";
  return (
    <div className={`${posicion} ${className}`}>
      {!quieto && <div aria-hidden className="tato-piso absolute inset-x-[12%] -bottom-1 h-[7%]" />}
      {/* key = pose: al cambiar de estado se vuelve a montar y corre su animación de entrada */}
      <Image
        key={pose}
        src={`/${mascota}/${archivo}`}
        alt={`${nombre} ${accion}`}
        width={ANCHO}
        height={ALTO}
        sizes={sizes}
        priority={priority}
        draggable={false}
        className={`${quieto ? "" : `tato tato-${pose}`} relative h-auto w-full select-none`}
      />
    </div>
  );
}
