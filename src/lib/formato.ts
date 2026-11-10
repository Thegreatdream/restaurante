/** 22000 → "$ 22.000" */
export function cop(valor: number): string {
  const entero = Math.round(valor).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `$ ${entero}`;
}

/** Hora corta en Colombia: "7:42 p. m." */
export function hora(iso: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Bogota",
  }).format(new Date(iso));
}

/** "12:00:00" → "12 m."; "17:00:00" → "5 p. m."; "18:30:00" → "6:30 p. m." */
export function horaReloj(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (h === 12 && m === 0) return "12 m.";
  if (h === 0 && m === 0) return "12 a. m.";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h < 12 ? "a. m." : "p. m."}`;
}

/** Hora local (HH:MM) y día de la semana de un instante, en la zona del restaurante. */
function partesLocales(iso: string, tz: string) {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const p = Object.fromEntries(f.map((x) => [x.type, x.value]));
  return { fecha: `${p.year}-${p.month}-${p.day}`, hora: `${p.hour}:${p.minute}` };
}

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

/** "hoy a las 12 m.", "mañana a las 12 m." o "el lunes a las 12 m." */
export function cuando(iso: string, tz = "America/Bogota"): string {
  const objetivo = partesLocales(iso, tz);
  const hoy = partesLocales(new Date().toISOString(), tz);
  const manana = partesLocales(new Date(Date.now() + 86_400_000).toISOString(), tz);
  const hora = horaReloj(objetivo.hora);
  if (objetivo.fecha === hoy.fecha) return `hoy a las ${hora}`;
  if (objetivo.fecha === manana.fecha) return `mañana a las ${hora}`;
  const dia = DIAS[new Date(`${objetivo.fecha}T12:00:00`).getDay()];
  return `el ${dia} a las ${hora}`;
}

/** Hora sola de un instante en la zona del restaurante: "5 p. m." */
export function horaDe(iso: string, tz = "America/Bogota"): string {
  return horaReloj(partesLocales(iso, tz).hora);
}

/** Resumen legible del horario: "Todos los días, 12 m. – 5 p. m." o "Lunes a viernes, …". */
export function resumenHorario(tramos: { weekday: number; opens: string; closes: string }[]): string[] {
  if (!tramos.length) return [];
  const porDia = new Map<number, string>();
  for (const t of tramos) {
    const r = `${horaReloj(t.opens)} – ${horaReloj(t.closes)}`;
    porDia.set(t.weekday, porDia.has(t.weekday) ? `${porDia.get(t.weekday)} y ${r}` : r);
  }
  const orden = [1, 2, 3, 4, 5, 6, 0]; // lunes primero
  const grupos: { dias: number[]; texto: string }[] = [];
  for (const d of orden) {
    const texto = porDia.get(d);
    if (!texto) continue;
    const ultimo = grupos.at(-1);
    const anterior = orden[orden.indexOf(d) - 1];
    if (ultimo && ultimo.texto === texto && ultimo.dias.at(-1) === anterior) ultimo.dias.push(d);
    else grupos.push({ dias: [d], texto });
  }
  const nombre = (d: number) => DIAS[d][0].toUpperCase() + DIAS[d].slice(1);
  return grupos.map(({ dias, texto }) => {
    if (dias.length === 7) return `Todos los días, ${texto}`;
    if (dias.length === 1) return `${nombre(dias[0])}, ${texto}`;
    return `${nombre(dias[0])} a ${DIAS[dias.at(-1)!]}, ${texto}`;
  });
}

/** Saludo según la hora en Colombia. */
export function saludo(fecha = new Date()): string {
  const h = Number(
    new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: "America/Bogota" }).format(fecha),
  );
  if (h >= 5 && h < 12) return "Buenos días";
  if (h >= 12 && h < 19) return "Buenas tardes";
  return "Buenas noches";
}

/** 3001234567 → "300 123 4567" */
export function celular(n: string): string {
  return n.replace(/^(\d{3})(\d{3})(\d{4})$/, "$1 $2 $3");
}

/** "sábado 15 de noviembre" en la zona del restaurante. */
export function fechaLarga(iso: string, tz = "America/Bogota"): string {
  return new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long", timeZone: tz }).format(new Date(iso));
}

/** Fecha (AAAA-MM-DD) de hoy en la zona del restaurante, más `dias`. */
export function fechaLocal(tz = "America/Bogota", dias = 0): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date(Date.now() + dias * 86_400_000));
}
