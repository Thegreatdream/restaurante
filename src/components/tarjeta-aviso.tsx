import { Tato } from "@/components/tato";

/**
 * Aviso a pantalla completa (link inválido, módulo apagado, algo no encontrado),
 * con la mascota para que hasta los errores se sientan del restaurante.
 */
export function TarjetaAviso({
  titulo,
  texto,
  mascota = "tato",
  children,
  pantallaCompleta = false,
}: {
  titulo: string;
  texto: string;
  mascota?: string;
  children?: React.ReactNode;
  pantallaCompleta?: boolean;
}) {
  return (
    <div className={`grid place-items-center px-4 py-10 ${pantallaCompleta ? "min-h-dvh" : "flex-1"}`}>
      <div className="aparecer flex w-full max-w-sm flex-col items-center rounded-[1.75rem] bg-surface p-6 text-center sticker">
        <Tato pose="libreta" mascota={mascota} quieto sizes="88px" className="w-[88px]" />
        <h1 className="mt-4 font-display text-2xl leading-tight font-extrabold text-balance">{titulo}</h1>
        <p className="mt-2 text-ink-soft">{texto}</p>
        {children}
      </div>
    </div>
  );
}
