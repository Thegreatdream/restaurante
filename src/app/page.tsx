import { BarraInfo } from "@/components/barra-info";
import { Encabezado } from "@/components/encabezado";
import { Bienvenida } from "@/components/menu/bienvenida";
import { Destacados } from "@/components/menu/destacados";
import { NavCategorias } from "@/components/menu/nav-categorias";
import { ListaMenu } from "@/components/menu/lista-menu";
import { ResumenCarrito } from "@/components/carrito/resumen-carrito";
import { CarritoMovil } from "@/components/carrito/carrito-movil";
import { GloboTato } from "@/components/carrito/globo-tato";
import { Pie } from "@/components/pie";
import { AvisoDemo } from "@/components/aviso-demo";
import { obtenerMenu } from "@/lib/menu";

export const revalidate = 60; // el menú se refresca como máximo cada minuto

export default async function Inicio() {
  const { categorias, ajustes, demo } = await obtenerMenu();

  return (
    <>
      <BarraInfo ajustes={ajustes} />
      <Encabezado debajoDeBarra />
      {demo && (
        <p className="bg-ink px-4 py-2 text-center text-xs font-semibold text-bg">
          Menú de muestra: falta conectar Supabase.
        </p>
      )}
      <AvisoDemo ajustes={ajustes} />
      <Bienvenida ajustes={ajustes} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 md:grid md:grid-cols-[minmax(0,1fr)_360px] md:gap-10">
        <div className="min-w-0">
          <Destacados categorias={categorias} />
          <div id="menu" className="scroll-mt-4">
            <NavCategorias categorias={categorias} />
            <ListaMenu categorias={categorias} />
          </div>
        </div>

        <aside className="hidden md:block" aria-label="Tu pedido">
          <div className="sticky top-6 mt-10 rounded-[1.75rem] bg-surface p-5 sticker">
            <h2 className="font-display text-2xl font-extrabold">Tu pedido</h2>
            <ResumenCarrito ajustes={ajustes} />
          </div>
        </aside>
      </main>

      <Pie ajustes={ajustes} />
      <CarritoMovil ajustes={ajustes} />
      <GloboTato />
    </>
  );
}
