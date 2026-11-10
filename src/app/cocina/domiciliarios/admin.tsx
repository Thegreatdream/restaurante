"use client";

import { useState, useTransition } from "react";
import { celular } from "@/lib/formato";
import { enlaceWhatsapp } from "@/lib/whatsapp";
import type { Domiciliario } from "@/lib/tipos";
import { cambiarDomiciliario, crearDomiciliario, renovarLink } from "./acciones";

export function AdminDomiciliarios({
  domiciliarios,
  base,
  restaurante,
}: {
  domiciliarios: Domiciliario[];
  base: string;
  restaurante: string;
}) {
  const [nombre, setNombre] = useState("");
  const [cel, setCel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, iniciar] = useTransition();

  function agregar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    iniciar(async () => {
      const r = await crearDomiciliario({ nombre, celular: cel });
      if (!r.ok) setError(r.mensaje);
      else {
        setNombre("");
        setCel("");
      }
    });
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-16">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Domiciliarios</h1>
      <p className="mt-1 text-ink-soft">
        Cada domiciliario tiene un link personal, sin contraseña. Ahí ve los domicilios para tomar y sus entregas.
      </p>

      <form onSubmit={agregar} className="mt-6 grid gap-3 rounded-[1.5rem] border-2 border-line bg-surface p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label htmlFor="d-nombre" className="mb-1.5 block text-[15px] font-bold">
            Nombre
          </label>
          <input id="d-nombre" className="campo" maxLength={40} value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
        <div>
          <label htmlFor="d-cel" className="mb-1.5 block text-[15px] font-bold">
            Celular
          </label>
          <input
            id="d-cel"
            className="campo tabular"
            type="tel"
            inputMode="numeric"
            placeholder="300 123 4567"
            maxLength={13}
            value={cel}
            onChange={(e) => setCel(e.target.value)}
          />
        </div>
        <button type="submit" className="btn" disabled={guardando || !nombre.trim() || !cel.trim()}>
          {guardando ? "Agregando…" : "Agregar"}
        </button>
        {error && <p className="text-sm font-semibold text-coral-ink sm:col-span-3">{error}</p>}
      </form>

      {domiciliarios.length === 0 ? (
        <p className="mt-8 text-ink-soft">
          Aún no hay domiciliarios. Mientras no registres ninguno, la cocina despacha con el botón de siempre.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {domiciliarios.map((d) => (
            <FilaDomiciliario key={d.id} d={d} base={base} restaurante={restaurante} />
          ))}
        </ul>
      )}
    </main>
  );
}

function FilaDomiciliario({ d, base, restaurante }: { d: Domiciliario; base: string; restaurante: string }) {
  const [cambiando, iniciar] = useTransition();
  const [copiado, setCopiado] = useState(false);
  const [renovar, setRenovar] = useState(false);
  const url = `${base}/repartidor/${d.token}`;
  const mensaje = `Hola ${d.name.split(" ")[0]}, este es tu enlace de domicilios de ${restaurante}. Guárdalo: ahí te llegan los pedidos para llevar. ${url}`;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {}
  };

  return (
    <li className={`rounded-[1.5rem] border-2 bg-surface p-4 ${d.active ? "border-line" : "border-dashed border-line opacity-60"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold">
          {d.name} <span className="tabular font-semibold text-ink-soft">· {celular(d.phone)}</span>
        </p>
        {!d.active && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-bold uppercase">Inactivo</span>}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {d.active && (
          <>
            <a href={enlaceWhatsapp(mensaje, d.phone)} target="_blank" rel="noopener" className="btn min-h-11 px-4 text-sm">
              Enviarle su link por WhatsApp
            </a>
            <button type="button" className="btn btn-ghost min-h-11 px-4 text-sm" onClick={copiar}>
              {copiado ? "Copiado" : "Copiar link"}
            </button>
          </>
        )}
        <button
          type="button"
          className="btn btn-ghost min-h-11 px-4 text-sm"
          disabled={cambiando}
          onClick={() => iniciar(async () => void (await cambiarDomiciliario(d.id, !d.active)))}
        >
          {d.active ? "Desactivar" : "Activar"}
        </button>
        {d.active &&
          (renovar ? (
            <button
              type="button"
              className="btn min-h-11 bg-coral px-4 text-sm"
              disabled={cambiando}
              onClick={() =>
                iniciar(async () => {
                  await renovarLink(d.id);
                  setRenovar(false);
                })
              }
            >
              Sí, el link anterior deja de servir
            </button>
          ) : (
            <button type="button" className="min-h-11 px-2 text-sm font-semibold text-ink-soft underline underline-offset-4" onClick={() => setRenovar(true)}>
              Renovar link
            </button>
          ))}
      </div>
    </li>
  );
}
