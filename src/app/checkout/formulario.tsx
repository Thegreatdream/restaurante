"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { carrito, useCarrito, useHidratado } from "@/lib/carrito";
import { cop } from "@/lib/formato";
import type { Ajustes, FormaPago } from "@/lib/tipos";
import { crearPedido, type DatosPedido } from "./acciones";
import { ResumenCarrito } from "@/components/carrito/resumen-carrito";
import { textoApertura } from "@/lib/apertura";

type Campos = Omit<DatosPedido, "items" | "pago" | "autorizo"> & { pago: FormaPago | ""; autorizo: boolean };
const CLAVE_DATOS = "tato:datos-entrega:v1";
const VACIO: Campos = {
  nombre: "",
  celular: "",
  correo: "",
  direccion: "",
  indicaciones: "",
  pago: "",
  pagaCon: "",
  autorizo: false,
};

export function FormularioEntrega({ ajustes }: { ajustes: Ajustes }) {
  const router = useRouter();
  const { items, cantidad, subtotal } = useCarrito();
  const hidratado = useHidratado();
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
      // La autorización de datos se pide de nuevo en cada pedido: nunca se da por hecha.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (guardado) setCampos((c) => ({ ...c, ...JSON.parse(guardado), pagaCon: "", autorizo: false }));
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
        autorizo: campos.autorizo as true,
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
        const { autorizo: _a, pagaCon: _p, ...recordar } = campos;
        void _a;
        void _p;
        localStorage.setItem(CLAVE_DATOS, JSON.stringify(recordar));
      } catch {}
      setEnviado(true);
      router.replace(`/pedido/${r.id}`);
      carrito.vaciar();
    });
  }

  if (hidratado && cantidad === 0 && !enviado && !enviando) {
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
          {errores.pago && <p className="mt-1.5 text-sm font-semibold text-coral-ink">{errores.pago}</p>}
        </fieldset>

        {campos.pago === "efectivo" && (
          <Campo id="pagaCon" etiqueta="¿Con cuánto pagas?" opcional ayuda="Para llevarte el cambio exacto.">
            <input
              id="f-pagaCon"
              className="campo tabular aparecer"
              inputMode="numeric"
              placeholder={`Ej: ${cop(Math.ceil((total + 1) / 10000) * 10000)}`}
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
          <p role="alert" className="mt-4 rounded-2xl bg-coral-soft px-4 py-3 text-sm font-semibold text-coral-ink">
            {mensaje}
          </p>
        )}

        {/* Autorización de tratamiento de datos (Ley 1581 de 2012): obligatoria y nunca marcada por defecto */}
        <label
          htmlFor="f-autorizo"
          className={`mt-4 flex cursor-pointer gap-3 rounded-2xl border-2 bg-surface p-4 text-sm leading-snug ${
            errores.autorizo ? "border-coral" : "border-line"
          }`}
        >
          <input
            id="f-autorizo"
            type="checkbox"
            checked={campos.autorizo}
            onChange={(e) => set("autorizo", e.target.checked)}
            disabled={ocupado}
            aria-invalid={Boolean(errores.autorizo)}
            aria-describedby={errores.autorizo ? "e-autorizo" : undefined}
            className="mt-0.5 size-5 shrink-0"
          />
          <span>
            Autorizo a {ajustes.legal_name || ajustes.name} a usar mis datos para preparar y entregar este pedido,
            según la{" "}
            <a href="/privacidad" target="_blank" className="font-semibold underline underline-offset-2">
              política de privacidad
            </a>
            .
          </span>
        </label>
        {errores.autorizo && (
          <p id="e-autorizo" className="mt-1.5 text-sm font-semibold text-coral-ink">
            {errores.autorizo}
          </p>
        )}

        <div className="pb-safe mt-4">
          {ajustes.estado.open ? (
            <button type="submit" className="btn w-full text-lg" disabled={ocupado}>
              {ocupado ? "Enviando tu pedido…" : `Confirmar pedido · ${cop(total)}`}
            </button>
          ) : (
            <p className="rounded-2xl bg-coral-soft px-4 py-3 text-center text-sm font-semibold text-coral-ink">
              {textoApertura(ajustes).aviso}
            </p>
          )}
          {ajustes.estado.open && (
            <p className="mt-2 text-center text-xs text-ink-soft">Al confirmar, la cocina recibe tu pedido de inmediato.</p>
          )}
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
        <p className="mt-1.5 text-sm font-semibold text-coral-ink">{error}</p>
      ) : (
        ayuda && <p className="mt-1.5 text-sm text-ink-soft">{ayuda}</p>
      )}
    </div>
  );
}
