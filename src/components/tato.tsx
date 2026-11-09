import Image from "next/image";

export type PoseTato = "bienvenida" | "libreta" | "cocinando" | "moto";

/**
 * Imagen de cada pose. Cuando lleguen las ilustraciones nuevas,
 * guárdalas en /public/tato/ y cambia solo la ruta de esa pose.
 */
const POSES: Record<PoseTato, { src: string; alt: string }> = {
  bienvenida: { src: "/tato/libreta.png", alt: "Tato el castor te da la bienvenida" },
  libreta: { src: "/tato/libreta.png", alt: "Tato anotando tu pedido en su libreta" },
  cocinando: { src: "/tato/libreta.png", alt: "Tato cocinando tu pedido" },
  moto: { src: "/tato/libreta.png", alt: "Tato llevando tu pedido en moto" },
};

// Tamaño real del archivo (todas las poses deben exportarse con la misma proporción).
const ANCHO = 576;
const ALTO = 1057;

export function Tato({
  pose,
  className = "",
  priority = false,
  sizes = "(min-width: 768px) 280px, 200px",
  quieto = false,
}: {
  pose: PoseTato;
  className?: string;
  priority?: boolean;
  sizes?: string;
  /** Sin animación ni sombra: para apariciones pequeñas y secundarias. */
  quieto?: boolean;
}) {
  const { src, alt } = POSES[pose];
  // El contenedor no fija su posición: quien lo usa decide (relative por defecto, o absolute).
  const posicion = /\b(absolute|fixed|sticky)\b/.test(className) ? "" : "relative";
  return (
    <div className={`${posicion} ${className}`}>
      {!quieto && <div aria-hidden className="tato-piso absolute inset-x-[12%] -bottom-1 h-[7%]" />}
      {/* key = pose: al cambiar de estado se vuelve a montar y corre su animación de entrada */}
      <Image
        key={pose}
        src={src}
        alt={alt}
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
