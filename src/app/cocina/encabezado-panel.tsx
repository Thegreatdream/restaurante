import Link from "next/link";
import type { Ajustes, RolMiembro } from "@/lib/tipos";
import { cerrarSesion } from "./acciones";

const ROL: Record<RolMiembro, string> = { admin: "Administrador", cocina: "Cocina", mesero: "Mesero" };

/** Encabezado del panel del restaurante, con las secciones que permite el rol. */
export function EncabezadoPanel({
  ajustes,
  rol,
  actual,
}: {
  ajustes: Ajustes;
  rol: RolMiembro;
  actual: "pedidos" | "ajustes";
}) {
  const secciones = [
    { id: "pedidos", texto: "Pedidos", href: "/cocina", ver: rol === "admin" || rol === "cocina" },
    { id: "ajustes", texto: "Ajustes", href: "/cocina/ajustes", ver: rol === "admin" },
  ].filter((s) => s.ver);

  return (
    <header className="border-b-2 border-outline bg-bg pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex min-h-14 max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2">
        <p className="font-display text-xl font-extrabold">
          {ajustes.name} <span className="text-sm font-bold text-ink-soft">· {ROL[rol]}</span>
        </p>
        <nav className="flex items-center gap-1 text-sm font-bold" aria-label="Secciones del panel">
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
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="max-w-sm rounded-[1.75rem] bg-surface p-6 text-center sticker">
        <h1 className="font-display text-2xl font-extrabold">Sin acceso</h1>
        <p className="mt-2 text-ink-soft">{mensaje}</p>
        <form action={cerrarSesion}>
          <button className="btn btn-ghost mt-5">Cerrar sesión</button>
        </form>
      </div>
    </main>
  );
}
