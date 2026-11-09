import { Encabezado } from "@/components/encabezado";
import { Bienvenida } from "@/components/menu/bienvenida";
import { NavCategorias } from "@/components/menu/nav-categorias";
import { ListaMenu } from "@/components/menu/lista-menu";
import { ResumenCarrito } from "@/components/carrito/resumen-carrito";
import { CarritoMovil } from "@/components/carrito/carrito-movil";
import { obtenerMenu } from "@/lib/menu";

export const revalidate = 60; // el menú se refresca como máximo cada minuto

export default async function Inicio() {
  const { categorias, ajustes, demo } = await obtenerMenu();

  return (
    <>
      <Encabezado />
      {demo && (
        <p className="bg-ink px-4 py-2 text-center text-xs font-semibold text-bg">
          Menú de muestra: falta conectar Supabase.
        </p>
      )}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 md:grid md:grid-cols-[minmax(0,1fr)_360px] md:gap-10">
        <div className="min-w-0">
          <Bienvenida ajustes={ajustes} />
          <NavCategorias categorias={categorias} />
          <ListaMenu categorias={categorias} />
        </div>

        <aside className="hidden md:block" aria-label="Tu pedido">
          <div className="sticky top-6 mt-8 rounded-[1.75rem] bg-surface p-5 sticker">
            <h2 className="font-display text-2xl font-extrabold">Tu pedido</h2>
            <ResumenCarrito ajustes={ajustes} />
          </div>
        </aside>
      </main>
      <CarritoMovil ajustes={ajustes} />
    </>
  );
}
