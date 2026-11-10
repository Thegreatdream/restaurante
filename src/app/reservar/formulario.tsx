"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { supabaseNavegador } from "@/lib/supabase/navegador";
import { fechaLocal, horaDe } from "@/lib/formato";
import type { Ajustes, FranjaReserva } from "@/lib/tipos";
import { crearReserva } from "./acciones";

const CLAVE = "tato:datos-reserva:v1";
const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function FormularioReserva({ ajustes }: { ajustes: Ajustes }) {
  const router = useRouter();
  const tz = ajustes.timezone;
  // Próximos días (hasta 14 a la vista; el resto con el calendario del celular)
  const dias = useMemo(
    () => Array.from({ length: Math.min(14, ajustes.reservation_days_ahead + 1) }, (_, i) => fechaLocal(tz, i)),
    [tz, ajustes.reservation_days_ahead],
  );
  const [fecha, setFecha] = useState(dias[0]);
  const [personas, setPersonas] = useState(2);
  const [franjas, setFranjas] = useState<FranjaReserva[] | null>(null);
  const [inicio, setInicio] = useState("");
  const [d, setD] = useState({ nombre: "", celular: "", correo: "", nota: "" });
  const [autorizo, setAutorizo] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();

  useEffect(() => {
    try {
      const g = localStorage.getItem(CLAVE);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (g) setD((x) => ({ ...x, ...JSON.parse(g), nota: "" }));
    } catch {}
  }, []);

  // Franjas del día elegido, con su cupo libre (la base de datos vuelve a revisar al reservar)
  useEffect(() => {
    let vivo = true;
    supabaseNavegador()
      .rpc("reservation_slots", { p_restaurant: ajustes.id, p_date: fecha })
      .then(({ data }) => {
        if (!vivo) return;
        setFranjas((data as FranjaReserva[]) ?? []);
        setInicio("");
      });
    return () => {
      vivo = false;
    };
  }, [fecha, ajustes.id]);

  const set = (k: keyof typeof d, v: string) => {
    setD((x) => ({ ...x, [k]: v }));
    if (errores[k]) setErrores((e) => ({ ...e, [k]: "" }));
  };

  function reservar(e: React.FormEvent) {
    e.preventDefault();
    setMensaje(null);
    iniciar(async () => {
      const r = await crearReserva({ inicio, personas, ...d, autorizo: autorizo as true });
      if (!r.ok) {
        setErrores(r.campos ?? {});
        setMensaje(r.mensaje);
        if (r.mensaje.includes("hora")) {
          const { data } = await supabaseNavegador().rpc("reservation_slots", { p_restaurant: ajustes.id, p_date: fecha });
          setFranjas((data as FranjaReserva[]) ?? []);
          setInicio("");
        }
        return;
      }
      try {
        localStorage.setItem(CLAVE, JSON.stringify({ nombre: d.nombre, celular: d.celular, correo: d.correo }));
      } catch {}
      router.push(`/reserva/${r.token}`);
    });
  }

  const etiquetaDia = (f: string, i: number) => {
    const [a, m, dd] = f.split("-").map(Number);
    const dia = new Date(Date.UTC(a, m - 1, dd, 12)).getUTCDay();
    return { arriba: i === 0 ? "Hoy" : i === 1 ? "Mañana" : DIAS_CORTOS[dia], abajo: `${dd} ${MESES[m - 1]}` };
  };

  return (
    <form onSubmit={reservar} noValidate className="mt-6 space-y-7">
      <fieldset>
        <legend className="text-[15px] font-bold">Día</legend>
        <div className="carril -mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1">
          {dias.map((f, i) => {
            const e = etiquetaDia(f, i);
            const activo = f === fecha;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFecha(f)}
                aria-pressed={activo}
                className={`flex min-h-16 w-[4.5rem] shrink-0 flex-col items-center justify-center rounded-2xl border-2 transition-colors ${
                  activo ? "border-outline bg-ink text-bg" : "border-line bg-surface"
                }`}
              >
                <span className="text-xs font-bold">{e.arriba}</span>
                <span className="tabular text-sm font-semibold">{e.abajo}</span>
              </button>
            );
          })}
        </div>
        {ajustes.reservation_days_ahead > 13 && (
          <label className="mt-3 flex items-center gap-3 text-sm">
            <span className="font-semibold text-ink-soft">Otra fecha:</span>
            <input
              type="date"
              className="campo min-h-11 w-auto py-1"
              min={dias[0]}
              max={fechaLocal(tz, ajustes.reservation_days_ahead)}
              value={fecha}
              onChange={(e) => e.target.value && setFecha(e.target.value)}
            />
          </label>
        )}
      </fieldset>

      <div className="max-w-xs">
        <label htmlFor="r-personas" className="mb-1.5 block text-[15px] font-bold">
          ¿Cuántos son?
        </label>
        <select id="r-personas" className="campo" value={personas} onChange={(e) => setPersonas(Number(e.target.value))}>
          {Array.from({ length: ajustes.reservation_max_party }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? "persona" : "personas"}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-sm text-ink-soft">¿Más de {ajustes.reservation_max_party}? Escríbenos directamente.</p>
      </div>

      <fieldset>
        <legend className="text-[15px] font-bold">Hora</legend>
        {franjas === null ? (
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5" aria-hidden>
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-line" />
            ))}
          </div>
        ) : franjas.length === 0 ? (
          <p className="mt-2 rounded-2xl bg-surface-2 px-4 py-3 text-sm">No hay horas para reservar este día. Prueba con otro.</p>
        ) : (
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {franjas.map((f) => {
              const alcanza = f.available >= personas;
              const activo = f.start === inicio;
              return (
                <button
                  key={f.start}
                  type="button"
                  disabled={!alcanza}
                  onClick={() => setInicio(f.start)}
                  aria-pressed={activo}
                  className={`tabular min-h-12 rounded-xl border-2 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:line-through ${
                    activo ? "border-outline bg-brand text-[#1e1a17]" : "border-line bg-surface"
                  }`}
                  title={alcanza ? undefined : "Sin cupo para ese número de personas"}
                >
                  {horaDe(f.start, tz)}
                </button>
              );
            })}
          </div>
        )}
        {errores.inicio && <p className="mt-1.5 text-sm font-semibold text-coral-ink">{errores.inicio}</p>}
      </fieldset>

      {inicio && (
        <fieldset className="aparecer space-y-4">
          <legend className="sr-only">Tus datos</legend>
          {(
            [
              ["nombre", "Nombre", { autoComplete: "name", maxLength: 80 }],
              ["celular", "Celular", { type: "tel", inputMode: "numeric", autoComplete: "tel-national", placeholder: "300 123 4567", maxLength: 12 }],
              ["correo", "Correo", { type: "email", inputMode: "email", autoComplete: "email", autoCapitalize: "none", maxLength: 120 }],
            ] as const
          ).map(([k, etiqueta, props]) => (
            <div key={k}>
              <label htmlFor={`r-${k}`} className="mb-1.5 block text-[15px] font-bold">
                {etiqueta}
              </label>
              <input id={`r-${k}`} className="campo" value={d[k]} onChange={(e) => set(k, e.target.value)} aria-invalid={Boolean(errores[k])} {...props} />
              {errores[k] && <p className="mt-1.5 text-sm font-semibold text-coral-ink">{errores[k]}</p>}
            </div>
          ))}
          <div>
            <label htmlFor="r-nota" className="mb-1.5 flex items-baseline gap-2 text-[15px] font-bold">
              Nota <span className="text-xs font-semibold text-ink-soft">Opcional</span>
            </label>
            <textarea
              id="r-nota"
              className="campo min-h-20 resize-y"
              placeholder="Cumpleaños, alergias, silla para bebé…"
              maxLength={300}
              rows={2}
              value={d.nota}
              onChange={(e) => set("nota", e.target.value)}
            />
          </div>
          <label className={`flex cursor-pointer gap-3 rounded-2xl border-2 bg-surface p-4 text-sm leading-snug ${errores.autorizo ? "border-coral" : "border-line"}`}>
            <input type="checkbox" checked={autorizo} onChange={(e) => setAutorizo(e.target.checked)} className="mt-0.5 size-5 shrink-0" />
            <span>
              Autorizo a {ajustes.legal_name || ajustes.name} a usar mis datos para gestionar esta reserva, según la{" "}
              <a href="/privacidad" target="_blank" className="font-semibold underline underline-offset-2">
                política de privacidad
              </a>
              .
            </span>
          </label>
          {mensaje && (
            <p role="alert" className="rounded-2xl bg-coral-soft px-4 py-3 text-sm font-semibold text-coral-ink">
              {mensaje}
            </p>
          )}
          <button type="submit" className="btn w-full text-lg" disabled={enviando}>
            {enviando ? "Reservando…" : `Reservar para ${personas} · ${horaDe(inicio, tz)}`}
          </button>
        </fieldset>
      )}
    </form>
  );
}
