"use client";

import Image from "next/image";
import { useId, useRef, useState, useTransition } from "react";
import { cop } from "@/lib/formato";
import { supabaseNavegador } from "@/lib/supabase/navegador";
import {
  borrarPlato,
  cambiarCategoriaVisible,
  cambiarDisponible,
  crearCategoria,
  guardarFoto,
  guardarPlato,
  renombrarCategoria,
  type DatosPlato,
} from "./acciones";

export type PlatoAdmin = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  badge: string | null;
  is_available: boolean;
  image_url: string | null;
};
export type CategoriaAdmin = { id: string; name: string; slug: string; is_active: boolean; products: PlatoAdmin[] };
type ListaCategorias = { id: string; name: string }[];

/* ------------------------------------------------------------------ */
/* Foto: se achica en el navegador antes de subirla (rápida en datos móviles) */
/* ------------------------------------------------------------------ */

const LADO_MAXIMO = 1400;

async function comprimir(archivo: File): Promise<Blob> {
  const bitmap = await createImageBitmap(archivo);
  const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
  const lienzo = document.createElement("canvas");
  lienzo.width = Math.round(bitmap.width * escala);
  lienzo.height = Math.round(bitmap.height * escala);
  lienzo.getContext("2d")!.drawImage(bitmap, 0, 0, lienzo.width, lienzo.height);
  bitmap.close();
  const aBlob = (tipo: string, calidad: number) =>
    new Promise<Blob | null>((ok) => lienzo.toBlob(ok, tipo, calidad));
  // WebP pesa menos; los navegadores que no lo generan devuelven otro formato, y ahí usamos JPEG
  const webp = await aBlob("image/webp", 0.82);
  if (webp && webp.type === "image/webp") return webp;
  const jpeg = await aBlob("image/jpeg", 0.85);
  if (!jpeg) throw new Error("No se pudo preparar la foto.");
  return jpeg;
}

function FotoPlato({ plato, restauranteId }: { plato: PlatoAdmin; restauranteId: string }) {
  const entrada = useRef<HTMLInputElement>(null);
  const id = useId();
  const [estado, setEstado] = useState<"quieto" | "subiendo" | "guardando">("quieto");
  const [error, setError] = useState<string | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);
  const ocupado = estado !== "quieto";

  async function alElegir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = ""; // permite volver a elegir la misma foto
    if (!archivo) return;
    if (!archivo.type.startsWith("image/")) return setError("Ese archivo no es una foto.");
    setError(null);
    setEstado("subiendo");
    const local = URL.createObjectURL(archivo);
    setVistaPrevia(local);
    try {
      const blob = await comprimir(archivo);
      const extension = blob.type === "image/webp" ? "webp" : "jpg";
      const ruta = `${restauranteId}/${plato.id}-${Date.now()}.${extension}`;
      const almacen = supabaseNavegador().storage.from("platos");
      const { error: errSubida } = await almacen.upload(ruta, blob, { contentType: blob.type, cacheControl: "31536000" });
      if (errSubida) throw new Error("No se pudo subir la foto. Revisa tu conexión e intenta de nuevo.");
      setEstado("guardando");
      const r = await guardarFoto(plato.id, almacen.getPublicUrl(ruta).data.publicUrl);
      if (!r.ok) throw new Error(r.mensaje);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la foto.");
    } finally {
      setEstado("quieto");
      setVistaPrevia(null);
      URL.revokeObjectURL(local);
    }
  }

  async function quitar() {
    setError(null);
    setEstado("guardando");
    const r = await guardarFoto(plato.id, null);
    if (!r.ok) setError(r.mensaje);
    setEstado("quieto");
  }

  const imagen = vistaPrevia ?? plato.image_url;
  return (
    <div className="w-full sm:w-44 sm:shrink-0">
      <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-surface-2">
        {imagen ? (
          vistaPrevia ? (
            // Vista previa local mientras sube (blob:), sin pasar por el optimizador
            // eslint-disable-next-line @next/next/no-img-element
            <img src={vistaPrevia} alt="" className="size-full object-cover" />
          ) : (
            <Image src={imagen} alt={plato.name} fill sizes="(min-width: 640px) 176px, 100vw" className="object-cover" />
          )
        ) : (
          <div className="grid size-full place-items-center px-3 text-center text-sm text-ink-soft">Sin foto todavía</div>
        )}
        {ocupado && (
          <div className="absolute inset-0 grid place-items-center bg-black/45 text-sm font-medium text-white" aria-live="polite">
            {estado === "subiendo" ? "Subiendo foto…" : "Guardando…"}
          </div>
        )}
      </div>
      <input ref={entrada} id={id} type="file" accept="image/*" className="sr-only" onChange={alElegir} disabled={ocupado} />
      <div className="mt-2 flex gap-2">
        <label
          htmlFor={id}
          className={`btn min-h-11 flex-1 cursor-pointer px-3 text-[13px] ${ocupado ? "pointer-events-none opacity-55" : ""}`}
        >
          {plato.image_url ? "Cambiar foto" : "Subir foto"}
        </label>
        {plato.image_url && (
          <button type="button" className="btn btn-ghost min-h-11 px-3 text-[13px]" onClick={quitar} disabled={ocupado}>
            Quitar
          </button>
        )}
      </div>
      {error && <p className="mt-1.5 text-sm font-medium text-coral-ink">{error}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Formulario de plato (nuevo o editar)                                 */
/* ------------------------------------------------------------------ */

function FormPlato({
  inicial,
  categorias,
  alTerminar,
}: {
  inicial: DatosPlato;
  categorias: ListaCategorias;
  alTerminar: () => void;
}) {
  const [d, setD] = useState({
    ...inicial,
    price: inicial.price ? String(inicial.price) : "",
    description: inicial.description ?? "",
    badge: inicial.badge ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [guardando, iniciar] = useTransition();
  const id = useId();
  const set = (k: keyof typeof d) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setD((v) => ({ ...v, [k]: e.target.value }));

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    iniciar(async () => {
      const r = await guardarPlato({ ...d, price: d.price.replace(/\D/g, "") });
      if (r.ok) alTerminar();
      else setError(r.mensaje);
    });
  }

  return (
    <form onSubmit={enviar} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label htmlFor={`${id}-n`} className="mb-1.5 block text-sm font-medium">
          Nombre del plato
        </label>
        <input id={`${id}-n`} className="campo" value={d.name} onChange={set("name")} maxLength={80} placeholder="Ej: Bandeja de la casa" />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`${id}-d`} className="mb-1.5 block text-sm font-medium">
          Descripción <span className="font-normal text-ink-soft">(opcional)</span>
        </label>
        <textarea
          id={`${id}-d`}
          className="campo min-h-24"
          value={d.description}
          onChange={set("description")}
          maxLength={240}
          placeholder="Qué trae: arroz, ensalada, jugo…"
        />
      </div>
      <div>
        <label htmlFor={`${id}-p`} className="mb-1.5 block text-sm font-medium">
          Precio (pesos)
        </label>
        <input
          id={`${id}-p`}
          className="campo tabular"
          inputMode="numeric"
          value={d.price}
          onChange={set("price")}
          placeholder="Ej: 15000"
        />
      </div>
      <div>
        <label htmlFor={`${id}-c`} className="mb-1.5 block text-sm font-medium">
          Categoría
        </label>
        <select id={`${id}-c`} className="campo" value={d.category_id} onChange={set("category_id")}>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`${id}-b`} className="mb-1.5 block text-sm font-medium">
          Etiqueta <span className="font-normal text-ink-soft">(opcional, p. ej. «Nuevo» o «Favorito de la casa»)</span>
        </label>
        <input id={`${id}-b`} className="campo" value={d.badge} onChange={set("badge")} maxLength={30} />
      </div>
      {error && <p className="text-sm font-medium text-coral-ink sm:col-span-2">{error}</p>}
      <div className="flex flex-wrap gap-3 sm:col-span-2">
        <button type="submit" className="btn" disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar plato"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={alTerminar} disabled={guardando}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Tarjeta de cada plato                                                */
/* ------------------------------------------------------------------ */

function TarjetaPlato({
  plato: p,
  categoriaId,
  categorias,
  restauranteId,
}: {
  plato: PlatoAdmin;
  categoriaId: string;
  categorias: ListaCategorias;
  restauranteId: string;
}) {
  const [editando, setEditando] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, iniciar] = useTransition();

  const accion = (f: () => Promise<{ ok: boolean; mensaje?: string }>) =>
    iniciar(async () => {
      setError(null);
      const r = await f();
      if (!r.ok) setError(r.mensaje ?? "Algo salió mal.");
    });

  return (
    <li className={`rounded-lg border border-line bg-surface p-4 shadow-[var(--sombra-suave)] ${p.is_available ? "" : "bg-surface/60"}`}>
      {editando ? (
        <FormPlato
          inicial={{ id: p.id, category_id: categoriaId, name: p.name, description: p.description ?? "", price: p.price, badge: p.badge ?? "" }}
          categorias={categorias}
          alTerminar={() => setEditando(false)}
        />
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row">
          <FotoPlato plato={p} restauranteId={restauranteId} />
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h3 className={`font-display text-2xl leading-tight ${p.is_available ? "" : "text-ink-soft line-through"}`}>{p.name}</h3>
              {p.badge && <span className="antetitulo text-[11px] text-hoja">{p.badge}</span>}
            </div>
            {p.description && <p className="mt-1 text-[15px] leading-relaxed text-ink-soft">{p.description}</p>}
            <p className="tabular mt-2 text-lg font-medium">{cop(p.price)}</p>

            <label className="mt-3 flex w-fit cursor-pointer items-center gap-3 text-[15px]">
              <span className="relative inline-flex">
                <input
                  type="checkbox"
                  role="switch"
                  className="peer sr-only"
                  checked={p.is_available}
                  disabled={ocupado}
                  onChange={(e) => accion(() => cambiarDisponible(p.id, e.target.checked))}
                />
                <span
                  aria-hidden
                  className="h-7 w-12 rounded-full border border-outline bg-line transition-colors duration-200 peer-checked:border-hoja peer-checked:bg-hoja peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink"
                />
                <span
                  aria-hidden
                  className="absolute top-1 left-1 size-5 rounded-full bg-white shadow transition-transform duration-200 ease-[var(--ease-out)] peer-checked:translate-x-5"
                />
              </span>
              {p.is_available ? "Disponible" : "Agotado: no se muestra en la página"}
            </label>

            <div className="mt-auto flex flex-wrap gap-2 pt-4">
              {borrando ? (
                <>
                  <span className="w-full text-sm">¿Borrar «{p.name}» para siempre?</span>
                  <button
                    type="button"
                    className="btn min-h-11 border-coral bg-coral px-4 text-[13px]"
                    disabled={ocupado}
                    onClick={() => accion(() => borrarPlato(p.id))}
                  >
                    {ocupado ? "Borrando…" : "Sí, borrar"}
                  </button>
                  <button type="button" className="btn btn-ghost min-h-11 px-4 text-[13px]" onClick={() => setBorrando(false)} disabled={ocupado}>
                    No
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="btn btn-ghost min-h-11 px-4 text-[13px]" onClick={() => setEditando(true)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className="min-h-11 px-3 text-[13px] font-medium tracking-[0.08em] text-coral-ink uppercase underline-offset-4 hover:underline"
                    onClick={() => setBorrando(true)}
                  >
                    Borrar
                  </button>
                </>
              )}
            </div>
            {error && <p className="mt-2 text-sm font-medium text-coral-ink">{error}</p>}
          </div>
        </div>
      )}
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Categoría: nombre, visible u oculta, platos y "Agregar plato"        */
/* ------------------------------------------------------------------ */

function SeccionCategoria({
  categoria: c,
  categorias,
  restauranteId,
}: {
  categoria: CategoriaAdmin;
  categorias: ListaCategorias;
  restauranteId: string;
}) {
  const [agregando, setAgregando] = useState(false);
  const [renombrando, setRenombrando] = useState(false);
  const [nombre, setNombre] = useState(c.name);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, iniciar] = useTransition();

  function guardarNombre(e: React.FormEvent) {
    e.preventDefault();
    iniciar(async () => {
      const r = await renombrarCategoria(c.id, nombre);
      if (r.ok) {
        setRenombrando(false);
        setError(null);
      } else setError(r.mensaje);
    });
  }

  return (
    <section className={`border-t border-line pt-8 ${c.is_active ? "" : "opacity-70"}`} aria-label={c.name}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        {renombrando ? (
          <form onSubmit={guardarNombre} className="flex w-full max-w-md flex-wrap gap-2">
            <label htmlFor={`cat-${c.id}`} className="sr-only">
              Nombre de la categoría
            </label>
            <input id={`cat-${c.id}`} className="campo min-w-0 flex-1" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={40} />
            <button type="submit" className="btn" disabled={ocupado}>
              Guardar
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => (setRenombrando(false), setNombre(c.name))}>
              Cancelar
            </button>
          </form>
        ) : (
          <div>
            <p className="antetitulo text-ink-soft">
              {c.products.length} {c.products.length === 1 ? "plato" : "platos"}
              {!c.is_active && " · oculta"}
            </p>
            <h2 className="mt-1 font-display text-3xl tracking-wide uppercase">{c.name}</h2>
          </div>
        )}
        {!renombrando && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] font-medium tracking-[0.08em] uppercase">
            <button type="button" className="min-h-11 text-ink-soft uppercase underline-offset-4 hover:text-ink hover:underline" onClick={() => setRenombrando(true)}>
              Cambiar nombre
            </button>
            <button
              type="button"
              className="min-h-11 text-ink-soft uppercase underline-offset-4 hover:text-ink hover:underline"
              disabled={ocupado}
              onClick={() =>
                iniciar(async () => {
                  const r = await cambiarCategoriaVisible(c.id, !c.is_active);
                  setError(r.ok ? null : r.mensaje);
                })
              }
            >
              {c.is_active ? "Ocultar categoría" : "Mostrar categoría"}
            </button>
          </div>
        )}
      </div>
      {error && <p className="mt-2 text-sm font-medium text-coral-ink">{error}</p>}

      <ul className="mt-5 grid gap-4">
        {c.products.map((p) => (
          <TarjetaPlato key={p.id} plato={p} categoriaId={c.id} categorias={categorias} restauranteId={restauranteId} />
        ))}
        {agregando && (
          <li className="rounded-lg border border-ink bg-surface p-4">
            <p className="antetitulo mb-4 text-ink-soft">Plato nuevo en {c.name}</p>
            <FormPlato
              inicial={{ category_id: c.id, name: "", description: "", price: 0, badge: "" }}
              categorias={categorias}
              alTerminar={() => setAgregando(false)}
            />
          </li>
        )}
      </ul>
      {!agregando && (
        <button type="button" className="btn btn-ghost mt-4" onClick={() => setAgregando(true)}>
          + Agregar plato
        </button>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */

export function AdminMenu({ categorias, restauranteId }: { categorias: CategoriaAdmin[]; restauranteId: string }) {
  const [nueva, setNueva] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creando, iniciar] = useTransition();
  const lista = categorias.map((c) => ({ id: c.id, name: c.name }));

  function agregarCategoria(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    iniciar(async () => {
      const r = await crearCategoria(nueva);
      if (r.ok) setNueva("");
      else setError(r.mensaje);
    });
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 pt-8 pb-20">
      <h1 className="font-display text-4xl tracking-wide uppercase">Menú</h1>
      <p className="mt-2 max-w-[60ch] text-ink-soft">
        Sube las fotos y cambia los platos desde aquí. Lo que guardes se ve de inmediato en la página de pedidos. Si un plato se
        acaba, márcalo como agotado en vez de borrarlo.
      </p>

      <div className="mt-10 space-y-12">
        {categorias.map((c) => (
          <SeccionCategoria key={c.id} categoria={c} categorias={lista} restauranteId={restauranteId} />
        ))}
      </div>

      <form onSubmit={agregarCategoria} className="mt-14 border-t border-line pt-8">
        <label htmlFor="nueva-categoria" className="antetitulo block text-ink-soft">
          Nueva categoría
        </label>
        <div className="mt-3 flex max-w-md flex-wrap gap-3">
          <input
            id="nueva-categoria"
            className="campo min-w-0 flex-1"
            placeholder="Ej: Sopas, Jugos naturales"
            maxLength={40}
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            aria-invalid={Boolean(error)}
          />
          <button type="submit" className="btn" disabled={creando || !nueva.trim()}>
            {creando ? "Creando…" : "Agregar"}
          </button>
        </div>
        {error && <p className="mt-1.5 text-sm font-medium text-coral-ink">{error}</p>}
        <p className="mt-2 text-sm text-ink-soft">Una categoría sin platos no aparece en la página hasta que le agregues uno.</p>
      </form>
    </main>
  );
}
