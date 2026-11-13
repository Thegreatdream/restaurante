import { LogoCasa } from "@/components/logo-casa";

/**
 * Aviso a pantalla completa (link inválido, módulo apagado, algo no encontrado),
 * con el emblema de la casa para que hasta los errores se sientan del restaurante.
 */
export function TarjetaAviso({
  titulo,
  texto,
  children,
  pantallaCompleta = false,
}: {
  titulo: string;
  texto: string;
  children?: React.ReactNode;
  pantallaCompleta?: boolean;
}) {
  return (
    <div className={`grid place-items-center px-4 py-10 ${pantallaCompleta ? "min-h-dvh" : "flex-1"}`}>
      <div className="aparecer flex w-full max-w-sm flex-col items-center rounded-lg bg-surface px-6 py-8 text-center sticker">
        <LogoCasa nombre="" className="size-16" />
        <h1 className="mt-5 font-display text-3xl leading-tight text-balance">{titulo}</h1>
        <p className="mt-2 text-ink-soft">{texto}</p>
        {children}
      </div>
    </div>
  );
}
