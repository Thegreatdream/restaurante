import { BarraInfo } from "@/components/barra-info";
import { Encabezado } from "@/components/encabezado";
import { Bienvenida } from "@/components/menu/bienvenida";
import { Destacados } from "@/components/menu/destacados";
import { NavCategorias } from "@/components/menu/nav-categorias";
import { ListaMenu } from "@/components/menu/lista-menu";
import { ResumenCarrito } from "@/components/carrito/resumen-carrito";
import { CarritoMovil } from "@/components/carrito/carrito-movil";
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

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12">
        <div className="@container min-w-0">
          <Destacados categorias={categorias} />
          <div id="menu" className="scroll-mt-4">
            <NavCategorias categorias={categorias} />
            <ListaMenu categorias={categorias} />
          </div>
        </div>

        <aside className="hidden lg:block" aria-label="Tu pedido">
          <div className="sticky top-6 mt-20 rounded-lg bg-surface p-6 sticker">
            <h2 className="font-display text-3xl tracking-wide uppercase">Tu pedido</h2>
            <ResumenCarrito ajustes={ajustes} />
          </div>
        </aside>
      </main>

      <Pie ajustes={ajustes} />
      <CarritoMovil ajustes={ajustes} />
    </>
  );
}
