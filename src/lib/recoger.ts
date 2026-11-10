import { horaDe } from "@/lib/formato";
import type { Ajustes } from "@/lib/tipos";

const PASO_MIN = 15;

/**
 * Horas disponibles para recoger hoy: desde ahora + el tiempo mínimo de preparación
 * (redondeado al siguiente cuarto de hora) hasta la hora de cierre del tramo actual.
 * La base de datos vuelve a validar la hora elegida al crear el pedido.
 */
export function franjasRecogida(a: Ajustes, ahora = Date.now()): { valor: string; texto: string }[] {
  if (!a.estado.open || !a.estado.closes_at) return [];
  const cierre = new Date(a.estado.closes_at).getTime();
  const paso = PASO_MIN * 60_000;
  let t = Math.ceil((ahora + a.pickup_lead_minutes * 60_000) / paso) * paso;
  const franjas: { valor: string; texto: string }[] = [];
  while (t <= cierre && franjas.length < 48) {
    const iso = new Date(t).toISOString();
    franjas.push({ valor: iso, texto: horaDe(iso, a.timezone) });
    t += paso;
  }
  return franjas;
}
