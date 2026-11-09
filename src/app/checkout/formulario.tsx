"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { carrito, useCarrito } from "@/lib/carrito";
import { cop } from "@/lib/formato";
import type { Ajustes, FormaPago } from "@/lib/tipos";
import { crearPedido, type DatosPedido } from "./acciones";
import { ResumenCarrito } from "@/components/carrito/resumen-carrito";

type Campos = Omit<DatosPedido, "items" | "pago"> & { pago: FormaPago | "" };
const CLAVE_DATOS = "tato:datos-entrega:v1";
const VACIO: Campos = { nombre: "", celular: "", correo: "", direccion: "", indicaciones: "", pago: "", pagaCon: "" };

export function FormularioEntrega({ ajustes }: { ajustes: Ajustes }) {
  const router = useRouter();
  const { items, cantidad, subtotal } = useCarrito();
  const [campos, setCampos] = useState<Campos>(VACIO);
  const [errores, setErrores] = useState<Partial<Record<string, string>>>({});
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();
  const [enviado, setEnviado] = useState(false);

  // Recordar los datos del cliente para su próximo pedido (solo en su celular)
  useEffect(() => {
    try {
      const guardado = localStorage.getItem(CLAVE_DATOS);
      // localStorage solo existe en el navegador: se lee una vez al abrir la página.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (guardado) setCampos((c) => ({ ...c, ...JSON.parse(guardado), pagaCon: "" }));
    } catch {}
  }, []);

  const set = <K extends keyof Campos>(k: K, v: Campos[K]) => {
    setCampos((c) => ({ ...c, [k]: v }));
    if (errores[k]) setErrores((e) => ({ ...e, [k]: undefined }));
  };

  const total = subtotal + ajustes.delivery_fee;

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setMensaje(null);
    iniciar(async () => {
      const r = await crearPedido({
        ...campos,
        pago: campos.pago as FormaPago,
        items: items.map((i) => ({ product_id: i.id, quantity: i.qty })),
      });
      if (!r.ok) {
        setErrores(r.campos ?? {});
        setMensaje(r.mensaje);
        const primero = r.campos && Object.keys(r.campos)[0];
        if (primero) document.getElementById(`f-${primero}`)?.focus();
        return;
      }
      try {
        localStorage.setItem(CLAVE_DATOS, JSON.stringify({ ...campos, pagaCon: "" }));
      } catch {}
      setEnviado(true);
      router.replace(`/pedido/${r.id}`);
      carrito.vaciar();
    });
  }

  if (cantidad === 0 && !enviado && !enviando) {
    return (
      <div className="mt-8 rounded-2xl border-2 border-line bg-surface p-6 text-center">
        <p className="font-display text-xl font-bold">Tu carrito está vacío</p>
        <Link href="/" className="btn mt-4">
          Ver el menú
        </Link>
      </div>
    );
  }

  const ocupado = enviando || enviado;

  return (
    <form onSubmit={enviar} noValidate className="mt-6 grid gap-8 md:grid-cols-[minmax(0,1fr)_340px] md:items-start">
      <fieldset disabled={ocupado} className="space-y-5">
        <Campo id="nombre" etiqueta="Nombre" error={errores.nombre}>
          <input
            id="f-nombre"
            className="campo"
            autoComplete="name"
            autoCapitalize="words"
            maxLength={80}
            value={campos.nombre}
            onChange={(e) => set("nombre", e.target.value)}
            aria-invalid={Boolean(errores.nombre)}
            required
          />
        </Campo>

        <Campo id="celular" etiqueta="Celular" ayuda="10 dígitos. Te llamamos si hace falta." error={errores.celular}>
          <input
            id="f-celular"
            className="campo tabular"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="300 123 4567"
            maxLength={12}
            value={campos.celular}
            onChange={(e) => set("celular", e.target.value.replace(/[^\d ]/g, ""))}
            aria-invalid={Boolean(errores.celular)}
            required
          />
        </Campo>

        <Campo id="correo" etiqueta="Correo" ayuda="Te avisamos aquí cuando tu pedido salga." error={errores.correo}>
          <input
            id="f-correo"
            className="campo"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="tucorreo@ejemplo.com"
            maxLength={120}
            value={campos.correo}
            onChange={(e) => set("correo", e.target.value)}
            aria-invalid={Boolean(errores.correo)}
            required
          />
        </Campo>

        <Campo id="direccion" etiqueta="Dirección" error={errores.direccion}>
          <input
            id="f-direccion"
            className="campo"
            autoComplete="street-address"
            placeholder="Calle 45 # 12-30"
            maxLength={200}
            value={campos.direccion}
            onChange={(e) => set("direccion", e.target.value)}
            aria-invalid={Boolean(errores.direccion)}
            required
          />
        </Campo>

        <Campo id="indicaciones" etiqueta="Indicaciones" opcional error={errores.indicaciones}>
          <textarea
            id="f-indicaciones"
            className="campo min-h-24 resize-y"
            placeholder="Apto, torre, barrio o un punto de referencia"
            maxLength={300}
            rows={3}
            value={campos.indicaciones}
            onChange={(e) => set("indicaciones", e.target.value)}
          />
        </Campo>

        <fieldset>
          <legend className="text-[15px] font-bold">Forma de pago</legend>
          <p className="text-sm text-ink-soft">Pagas cuando recibes tu pedido.</p>
          <div className="mt-2 grid grid-cols-2 gap-3" role="radiogroup" aria-invalid={Boolean(errores.pago)}>
            {(
              [
                ["efectivo", "Efectivo"],
                ["transferencia", "Transferencia"],
              ] as const
            ).map(([valor, texto]) => (
              <label
                key={valor}
                className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 font-bold transition-colors duration-150 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-brand ${
                  campos.pago === valor ? "border-outline bg-surface-2" : "border-line bg-surface"
                }`}
              >
                <input
                  id={valor === "efectivo" ? "f-pago" : undefined}
                  type="radio"
                  name="pago"
                  value={valor}
                  checked={campos.pago === valor}
                  onChange={() => set("pago", valor)}
                  className="size-5 accent-[var(--brand-strong)]"
                />
                {texto}
              </label>
            ))}
          </div>
          {errores.pago && <p className="mt-1.5 text-sm font-semibold text-coral">{errores.pago}</p>}
        </fieldset>

        {campos.pago === "efectivo" && (
          <Campo id="pagaCon" etiqueta="¿Con cuánto pagas?" opcional ayuda="Para llevarte el cambio exacto.">
            <input
              id="f-pagaCon"
              className="campo tabular aparecer"
              inputMode="numeric"
              placeholder={cop(Math.ceil(total / 10000) * 10000 + (total % 10000 === 0 ? 10000 : 0))}
              value={campos.pagaCon ? cop(Number(String(campos.pagaCon).replace(/\D/g, ""))) : ""}
              onChange={(e) => set("pagaCon", e.target.value.replace(/\D/g, "").slice(0, 7))}
            />
          </Campo>
        )}
        {campos.pago === "transferencia" && (
          <p className="aparecer rounded-2xl bg-surface-2 px-4 py-3 text-sm leading-snug">
            Al recibir el pedido le transfieres al domiciliario por Nequi o Bancolombia.
          </p>
        )}
      </fieldset>

      <div className="md:sticky md:top-6">
        <div className="rounded-[1.75rem] bg-surface p-5 sticker">
          <h2 className="font-display text-xl font-extrabold">Tu pedido</h2>
          <ResumenCarrito ajustes={ajustes} conBoton={false} />
        </div>

        {mensaje && (
          <p role="alert" className="mt-4 rounded-2xl bg-coral-soft px-4 py-3 text-sm font-semibold text-coral">
            {mensaje}
          </p>
        )}

        <div className="pb-safe mt-4">
          <button type="submit" className="btn w-full text-lg" disabled={ocupado || !ajustes.is_open}>
            {ocupado ? "Enviando tu pedido…" : `Confirmar pedido · ${cop(total)}`}
          </button>
          <p className="mt-2 text-center text-xs text-ink-soft">Al confirmar, la cocina recibe tu pedido de inmediato.</p>
        </div>
      </div>
    </form>
  );
}

function Campo({
  id,
  etiqueta,
  ayuda,
  opcional,
  error,
  children,
}: {
  id: string;
  etiqueta: string;
  ayuda?: string;
  opcional?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={`f-${id}`} className="mb-1.5 flex items-baseline gap-2 text-[15px] font-bold">
        {etiqueta}
        {opcional && <span className="text-xs font-semibold text-ink-soft">Opcional</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-sm font-semibold text-coral">{error}</p>
      ) : (
        ayuda && <p className="mt-1.5 text-sm text-ink-soft">{ayuda}</p>
      )}
    </div>
  );
}
