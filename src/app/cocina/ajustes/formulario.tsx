"use client";

import { useState, useTransition } from "react";
import type { Ajustes } from "@/lib/tipos";
import { cop } from "@/lib/formato";
import { guardarAjustes, type DatosAjustes } from "./acciones";

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const ORDEN = [1, 2, 3, 4, 5, 6, 0]; // lunes primero

const MODULOS: { clave: keyof Ajustes; nombre: string; detalle: string; listo: boolean }[] = [
  { clave: "mod_delivery", nombre: "Domicilio", detalle: "El cliente pide y se lo llevan a su casa.", listo: true },
  { clave: "mod_pickup", nombre: "Para recoger", detalle: "El cliente pide y pasa a recogerlo.", listo: false },
  { clave: "mod_table", nombre: "Pedido en mesa (QR)", detalle: "Cada mesa tiene un QR para pedir.", listo: false },
  { clave: "mod_reservations", nombre: "Reservas", detalle: "Reservar mesa por fecha y hora.", listo: false },
  { clave: "mod_reviews", nombre: "Opiniones", detalle: "Calificaciones privadas y anónimas.", listo: false },
  { clave: "mod_menu_qr", nombre: "Menú QR", detalle: "Menú de solo lectura para imprimir.", listo: false },
];

type Estado = DatosAjustes;

function inicial(a: Ajustes): Estado {
  const v = (x: string | null) => x ?? "";
  return {
    name: a.name,
    tagline: v(a.tagline),
    logo_url: v(a.logo_url),
    color_brand: a.color_brand,
    color_accent: a.color_accent,
    color_band: a.color_band,
    is_open: a.is_open,
    demo_mode: a.demo_mode,
    delivery_fee: a.delivery_fee,
    min_order: a.min_order,
    prep_delay_minutes: a.prep_delay_minutes,
    mod_delivery: a.mod_delivery,
    address: v(a.address),
    phone: v(a.phone),
    whatsapp: a.whatsapp?.replace(/^57(?=3\d{9}$)/, "") ?? "",
    maps_url: v(a.maps_url),
    instagram: v(a.instagram),
    facebook: v(a.facebook),
    tiktok: v(a.tiktok),
    legal_name: v(a.legal_name),
    legal_id: v(a.legal_id),
    privacy_email: v(a.privacy_email),
    horario: [0, 1, 2, 3, 4, 5, 6].map((d) => {
      const t = a.horario.find((h) => h.weekday === d);
      return { weekday: d, abierto: Boolean(t), opens: t?.opens.slice(0, 5) ?? "12:00", closes: t?.closes.slice(0, 5) ?? "17:00" };
    }),
  };
}

export function FormularioAjustes({ ajustes }: { ajustes: Ajustes }) {
  const [d, setD] = useState<Estado>(() => inicial(ajustes));
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [guardando, iniciar] = useTransition();
  const [cambios, setCambios] = useState(false);

  const set = <K extends keyof Estado>(k: K, v: Estado[K]) => {
    setD((x) => ({ ...x, [k]: v }));
    setCambios(true);
    setAviso(null);
    if (errores[k as string]) setErrores((e) => ({ ...e, [k as string]: "" }));
  };
  const setDia = (weekday: number, cambio: Partial<Estado["horario"][number]>) => {
    set(
      "horario",
      d.horario.map((h) => (h.weekday === weekday ? { ...h, ...cambio } : h)),
    );
  };

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    iniciar(async () => {
      const r = await guardarAjustes(d);
      if (r.ok) {
        setAviso({ tipo: "ok", texto: "Ajustes guardados." });
        setCambios(false);
        setErrores({});
      } else {
        setAviso({ tipo: "error", texto: r.mensaje });
        setErrores(r.campos ?? {});
      }
    });
  }

  const campoTexto = (k: keyof Estado, etiqueta: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, ayuda?: string) => (
    <div>
      <label htmlFor={`a-${k}`} className="mb-1.5 block text-[15px] font-bold">
        {etiqueta}
      </label>
      <input
        id={`a-${k}`}
        className="campo"
        value={String(d[k] ?? "")}
        onChange={(e) => set(k, e.target.value as never)}
        aria-invalid={Boolean(errores[k as string])}
        {...props}
      />
      {errores[k as string] ? (
        <p className="mt-1.5 text-sm font-semibold text-coral-ink">{errores[k as string]}</p>
      ) : (
        ayuda && <p className="mt-1.5 text-sm text-ink-soft">{ayuda}</p>
      )}
    </div>
  );

  const campoPesos = (k: "delivery_fee" | "min_order", etiqueta: string, ayuda?: string) => (
    <div>
      <label htmlFor={`a-${k}`} className="mb-1.5 block text-[15px] font-bold">
        {etiqueta}
      </label>
      <input
        id={`a-${k}`}
        className="campo tabular"
        inputMode="numeric"
        value={d[k] ? cop(d[k] as number) : "$ 0"}
        onChange={(e) => set(k, Number(e.target.value.replace(/\D/g, "").slice(0, 7)) || 0)}
      />
      {ayuda && <p className="mt-1.5 text-sm text-ink-soft">{ayuda}</p>}
    </div>
  );

  return (
    <form onSubmit={guardar} noValidate className="mt-6 space-y-6">
      <Seccion titulo="Pedidos" descripcion="Lo que más vas a cambiar en el día a día.">
        <Interruptor
          id="is_open"
          activo={d.is_open}
          alCambiar={(v) => set("is_open", v)}
          titulo="Recibiendo pedidos"
          detalle="Apágalo para pausar los pedidos un rato aunque estés dentro del horario."
        />
        <Interruptor
          id="demo_mode"
          activo={d.demo_mode}
          alCambiar={(v) => set("demo_mode", v)}
          titulo="Modo demostración"
          detalle='Muestra "Restaurante de demostración" y marca los pedidos como prueba.'
        />
        <div className="grid gap-4 sm:grid-cols-3">
          {campoPesos("delivery_fee", "Costo del domicilio")}
          {campoPesos("min_order", "Pedido mínimo", "$ 0 = sin mínimo.")}
          <div>
            <label htmlFor="a-prep" className="mb-1.5 block text-[15px] font-bold">
              Pasa a “preparando”
            </label>
            <select
              id="a-prep"
              className="campo"
              value={d.prep_delay_minutes}
              onChange={(e) => set("prep_delay_minutes", Number(e.target.value))}
            >
              {[0, 1, 2, 3, 5, 10, 15].map((m) => (
                <option key={m} value={m}>
                  {m === 0 ? "De inmediato" : `A los ${m} min`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Seccion>

      <Seccion titulo="Horario" descripcion="Fuera de este horario la página muestra “Cerrado” y no deja pedir. Hora de Colombia.">
        <div className={`divide-y-2 divide-line rounded-2xl border-2 ${errores.horario ? "border-coral" : "border-line"}`}>
          {ORDEN.map((dia) => {
            const h = d.horario.find((x) => x.weekday === dia)!;
            return (
              <div key={dia} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                <label className="flex min-w-32 cursor-pointer items-center gap-3 font-bold">
                  <input
                    type="checkbox"
                    checked={h.abierto}
                    onChange={(e) => setDia(dia, { abierto: e.target.checked })}
                    className="size-5"
                  />
                  {DIAS[dia]}
                </label>
                {h.abierto ? (
                  <div className="flex items-center gap-2 text-sm">
                    <input
                      type="time"
                      aria-label={`${DIAS[dia]}: abre`}
                      className="campo min-h-11 w-[8.5rem] py-1"
                      value={h.opens}
                      onChange={(e) => setDia(dia, { opens: e.target.value })}
                    />
                    <span className="text-ink-soft">a</span>
                    <input
                      type="time"
                      aria-label={`${DIAS[dia]}: cierra`}
                      className="campo min-h-11 w-[8.5rem] py-1"
                      value={h.closes}
                      onChange={(e) => setDia(dia, { closes: e.target.value })}
                    />
                  </div>
                ) : (
                  <span className="text-sm text-ink-soft">Cerrado</span>
                )}
              </div>
            );
          })}
        </div>
      </Seccion>

      <Seccion titulo="Módulos" descripcion="Lo que el cliente puede hacer en tu página.">
        <div className="grid gap-3 sm:grid-cols-2">
          {MODULOS.map((m) =>
            m.listo ? (
              <Interruptor
                key={m.clave}
                id={m.clave}
                activo={Boolean(d[m.clave as keyof Estado])}
                alCambiar={(v) => set(m.clave as "mod_delivery", v)}
                titulo={m.nombre}
                detalle={m.detalle}
              />
            ) : (
              <div key={m.clave} className="rounded-2xl border-2 border-dashed border-line p-4 opacity-70">
                <p className="flex items-center justify-between gap-2 font-bold">
                  {m.nombre}
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] tracking-wide uppercase">Próximamente</span>
                </p>
                <p className="mt-1 text-sm text-ink-soft">{m.detalle}</p>
              </div>
            ),
          )}
        </div>
      </Seccion>

      <Seccion titulo="Identidad" descripcion="Cómo se ve tu restaurante.">
        {campoTexto("name", "Nombre del restaurante", { maxLength: 60, autoComplete: "organization" })}
        {campoTexto("tagline", "Frase corta", { maxLength: 80, placeholder: "Comida casera a domicilio" })}
        {campoTexto(
          "logo_url",
          "Logo (enlace)",
          { inputMode: "url", placeholder: "https://…", spellCheck: false },
          "Si lo dejas vacío se usa la cara de la mascota. La subida de imágenes llega más adelante.",
        )}
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              ["color_brand", "Principal"],
              ["color_accent", "Contraste"],
              ["color_band", "Franjas oscuras"],
            ] as const
          ).map(([k, nombre]) => (
            <label key={k} className="block">
              <span className="mb-1.5 block text-[15px] font-bold">{nombre}</span>
              <span className="flex items-center gap-2 rounded-xl border-2 border-line bg-surface p-1.5">
                <input
                  type="color"
                  value={d[k]}
                  onChange={(e) => set(k, e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded-lg border-0 bg-transparent"
                />
                <span className="tabular text-sm text-ink-soft uppercase">{d[k]}</span>
              </span>
            </label>
          ))}
        </div>
      </Seccion>

      <Seccion titulo="Contacto" descripcion="Lo que dejes vacío no aparece en la página.">
        <div className="grid gap-4 sm:grid-cols-2">
          {campoTexto("whatsapp", "WhatsApp", { inputMode: "tel", placeholder: "300 123 4567" })}
          {campoTexto("phone", "Teléfono", { inputMode: "tel", placeholder: "601 123 4567" })}
        </div>
        {campoTexto("address", "Dirección", { placeholder: "Calle 45 # 12-30, Chapinero" })}
        {campoTexto(
          "maps_url",
          "Enlace de Google Maps",
          { inputMode: "url", placeholder: "https://maps.app.goo.gl/…", spellCheck: false },
          "En Google Maps busca tu restaurante, toca Compartir y copia el enlace.",
        )}
        <div className="grid gap-4 sm:grid-cols-3">
          {campoTexto("instagram", "Instagram", { placeholder: "usuario", autoCapitalize: "none" })}
          {campoTexto("facebook", "Facebook", { placeholder: "página", autoCapitalize: "none" })}
          {campoTexto("tiktok", "TikTok", { placeholder: "usuario", autoCapitalize: "none" })}
        </div>
      </Seccion>

      <Seccion titulo="Datos legales" descripcion="Aparecen en la política de privacidad (Ley 1581).">
        {campoTexto("legal_name", "Razón social o nombre del responsable")}
        <div className="grid gap-4 sm:grid-cols-2">
          {campoTexto("legal_id", "NIT o cédula")}
          {campoTexto("privacy_email", "Correo para solicitudes de datos", { type: "email", inputMode: "email", autoCapitalize: "none" })}
        </div>
      </Seccion>

      {/* Barra fija para guardar */}
      <div className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t-2 border-outline bg-bg/95 px-4 pt-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 pb-3">
          <p
            role="status"
            className={`text-sm font-semibold ${aviso?.tipo === "error" ? "text-coral-ink" : aviso ? "text-ok" : "text-ink-soft"}`}
          >
            {aviso?.texto ?? (cambios ? "Tienes cambios sin guardar." : "Todo guardado.")}
          </p>
          <button type="submit" className="btn shrink-0" disabled={guardando || !cambios}>
            {guardando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </form>
  );
}

function Seccion({ titulo, descripcion, children }: { titulo: string; descripcion: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-[1.5rem] border-2 border-line bg-surface p-5">
      <legend className="sr-only">{titulo}</legend>
      <h2 className="font-display text-xl font-extrabold">{titulo}</h2>
      <p className="mt-0.5 text-sm text-ink-soft">{descripcion}</p>
      <div className="mt-4 space-y-4">{children}</div>
    </fieldset>
  );
}

function Interruptor({
  id,
  activo,
  alCambiar,
  titulo,
  detalle,
}: {
  id: string;
  activo: boolean;
  alCambiar: (v: boolean) => void;
  titulo: string;
  detalle: string;
}) {
  return (
    <label htmlFor={`s-${id}`} className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border-2 border-line p-4">
      <span>
        <span className="block font-bold">{titulo}</span>
        <span className="mt-0.5 block text-sm text-ink-soft">{detalle}</span>
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          id={`s-${id}`}
          type="checkbox"
          role="switch"
          checked={activo}
          onChange={(e) => alCambiar(e.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className="h-7 w-12 rounded-full border-2 border-outline bg-line transition-colors duration-200 peer-checked:bg-hoja peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink"
        />
        <span
          aria-hidden
          className="absolute top-1 left-1 size-5 rounded-full border-2 border-outline bg-surface transition-transform duration-200 ease-[var(--ease-out)] peer-checked:translate-x-5"
        />
      </span>
    </label>
  );
}
