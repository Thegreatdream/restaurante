import Link from "next/link";
import type { Ajustes, RolMiembro } from "@/lib/tipos";
import { cerrarSesion } from "./acciones";
import { TarjetaAviso } from "@/components/tarjeta-aviso";

const ROL: Record<RolMiembro, string> = { admin: "Administrador", cocina: "Cocina", mesero: "Mesero" };

/** Encabezado del panel del restaurante, con las secciones que permite el rol. */
export function EncabezadoPanel({
  ajustes,
  rol,
  actual,
}: {
  ajustes: Ajustes;
  rol: RolMiembro;
  actual: "pedidos" | "meseros" | "mesas" | "domiciliarios" | "reservas" | "ajustes";
}) {
  const secciones = [
    { id: "pedidos", texto: "Pedidos", href: "/cocina", ver: rol === "admin" || rol === "cocina" },
    { id: "meseros", texto: "Meseros", href: "/cocina/meseros", ver: ajustes.mod_table && (rol === "admin" || rol === "mesero") },
    { id: "mesas", texto: "Mesas", href: "/cocina/mesas", ver: ajustes.mod_table && rol === "admin" },
    { id: "reservas", texto: "Reservas", href: "/cocina/reservas", ver: ajustes.mod_reservations && (rol === "admin" || rol === "mesero") },
    { id: "domiciliarios", texto: "Domiciliarios", href: "/cocina/domiciliarios", ver: ajustes.mod_delivery && rol === "admin" },
    { id: "ajustes", texto: "Ajustes", href: "/cocina/ajustes", ver: rol === "admin" },
  ].filter((s) => s.ver);

  return (
    <header className="border-b-2 border-outline bg-bg pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex min-h-14 max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2">
        <p className="font-display text-xl font-extrabold">
          {ajustes.name} <span className="text-sm font-bold text-ink-soft">· {ROL[rol]}</span>
        </p>
        <nav className="-mx-1 flex flex-wrap items-center gap-1 text-sm font-bold" aria-label="Secciones del panel">
          {secciones.map((s) => (
            <Link
              key={s.id}
              href={s.href}
              aria-current={actual === s.id ? "page" : undefined}
              className={`rounded-full px-3 py-2 transition-colors ${
                actual === s.id ? "bg-ink text-bg" : "text-ink-soft hover:text-ink"
              }`}
            >
              {s.texto}
            </Link>
          ))}
          <form action={cerrarSesion}>
            <button className="rounded-full px-3 py-2 text-ink-soft hover:text-ink">Salir</button>
          </form>
        </nav>
      </div>
    </header>
  );
}

/** Pantalla para cuentas sin permiso en este restaurante. */
export function SinAcceso({ mensaje }: { mensaje: string }) {
  return (
    <main>
      <TarjetaAviso pantallaCompleta titulo="Sin acceso" texto={mensaje}>
        <form action={cerrarSesion}>
          <button className="btn btn-ghost mt-5">Cerrar sesión</button>
        </form>
      </TarjetaAviso>
    </main>
  );
}
