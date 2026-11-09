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
