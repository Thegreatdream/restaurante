"use client";

import { useEffect, useState, useTransition } from "react";
import QRCode from "qrcode";
import { cambiarMesa, crearMesa } from "./acciones";

type Mesa = { id: string; label: string; token: string; active: boolean };

/** Genera la imagen del QR en el navegador (sin enviar nada a terceros). */
function useQR(url: string) {
  const [img, setImg] = useState<string | null>(null);
  useEffect(() => {
    let vivo = true;
    QRCode.toDataURL(url, { margin: 1, width: 720, errorCorrectionLevel: "M", color: { dark: "#1e1a17", light: "#ffffff" } })
      .then((d) => vivo && setImg(d))
      .catch(() => vivo && setImg(null));
    return () => {
      vivo = false;
    };
  }, [url]);
  return img;
}

export function AdminMesas({ mesas, base, nombre }: { mesas: Mesa[]; base: string; nombre: string }) {
  const [nueva, setNueva] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, iniciar] = useTransition();

  function agregar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    iniciar(async () => {
      const r = await crearMesa(nueva);
      if (!r.ok) setError(r.mensaje);
      else setNueva("");
    });
  }

  const activas = mesas.filter((m) => m.active);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-16">
      <div className="no-imprimir">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight">Mesas</h1>
            <p className="mt-1 text-ink-soft">Cada mesa tiene su QR. Imprímelo y ponlo en la mesa: el código no cambia.</p>
          </div>
          {activas.length > 0 && (
            <button type="button" className="btn btn-ghost" onClick={() => window.print()}>
              Imprimir todos los QR
            </button>
          )}
        </div>

        <form onSubmit={agregar} className="mt-6 flex max-w-md flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <label htmlFor="nueva-mesa" className="sr-only">
              Nombre o número de la mesa
            </label>
            <input
              id="nueva-mesa"
              className="campo"
              placeholder="Ej: 4, Terraza 2, Barra"
              maxLength={20}
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              aria-invalid={Boolean(error)}
            />
            {error && <p className="mt-1.5 text-sm font-semibold text-coral-ink">{error}</p>}
          </div>
          <button type="submit" className="btn" disabled={guardando || !nueva.trim()}>
            {guardando ? "Agregando…" : "Agregar mesa"}
          </button>
        </form>

        {mesas.length === 0 && <p className="mt-8 text-ink-soft">Aún no hay mesas. Agrega la primera.</p>}
      </div>

      {/* En pantalla: tarjetas con acciones. Al imprimir: solo los QR de las mesas activas, en cuadrícula. */}
      <ul className="hoja-qr mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mesas.map((m) => (
          <TarjetaMesa key={m.id} mesa={m} url={`${base}/mesa/${m.token}`} nombre={nombre} />
        ))}
      </ul>
    </main>
  );
}

function TarjetaMesa({ mesa: m, url, nombre }: { mesa: Mesa; url: string; nombre: string }) {
  const qr = useQR(url);
  const [cambiando, iniciar] = useTransition();
  return (
    <li className={`qr-tarjeta flex flex-col items-center rounded-[1.5rem] bg-surface p-5 text-center sticker ${m.active ? "" : "inactiva opacity-60"}`}>
      <p className="font-display text-3xl font-extrabold tracking-tight">Mesa {m.label}</p>
      <p className="solo-imprimir mt-1 text-sm">Escanea para ver el menú y pedir · {nombre}</p>
      <div className="mt-4 aspect-square w-full max-w-[240px] rounded-xl border-2 border-line bg-white p-2">
        {qr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt={`Código QR de la mesa ${m.label}`} className="size-full" />
        ) : (
          <div className="size-full animate-pulse rounded-lg bg-line" />
        )}
      </div>
      <div className="no-imprimir mt-4 flex w-full flex-wrap justify-center gap-2">
        {qr && (
          <a href={qr} download={`QR-mesa-${m.label}.png`} className="btn min-h-11 px-4 text-sm">
            Descargar QR
          </a>
        )}
        <a href={url} target="_blank" rel="noopener" className="btn btn-ghost min-h-11 px-4 text-sm">
          Probar
        </a>
        <button
          type="button"
          className="btn btn-ghost min-h-11 px-4 text-sm"
          disabled={cambiando}
          onClick={() => iniciar(async () => void (await cambiarMesa(m.id, !m.active)))}
        >
          {m.active ? "Desactivar" : "Activar"}
        </button>
      </div>
      {!m.active && <p className="no-imprimir mt-2 text-xs font-semibold text-ink-soft">Inactiva: su QR no acepta pedidos.</p>}
    </li>
  );
}
