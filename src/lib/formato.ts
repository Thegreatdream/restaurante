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

/** 3001234567 → "300 123 4567" */
export function celular(n: string): string {
  return n.replace(/^(\d{3})(\d{3})(\d{4})$/, "$1 $2 $3");
}
