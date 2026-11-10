import { cuando, horaDe } from "@/lib/formato";
import type { Ajustes } from "@/lib/tipos";

/** Textos de abierto / cerrado a partir de lo que calcula la base de datos. */
export function textoApertura(a: Ajustes): { abierto: boolean; corto: string; aviso: string | null } {
  const { estado, timezone } = a;
  if (estado.open) {
    return {
      abierto: true,
      corto: estado.closes_at ? `Abierto · cierra a las ${horaDe(estado.closes_at, timezone)}` : "Abierto",
      aviso: null,
    };
  }
  if (estado.paused) {
    return {
      abierto: false,
      corto: "Pedidos en pausa",
      aviso: "Pausamos los pedidos por un momento. Vuelve a intentarlo en unos minutos.",
    };
  }
  const abre = estado.next_open ? cuando(estado.next_open, timezone) : null;
  // "12 m." y "5 p. m." ya terminan en punto: no agregar otro.
  const fin = (s: string) => (s.endsWith(".") ? s : `${s}.`);
  return {
    abierto: false,
    corto: abre ? `Cerrado · abrimos ${abre}` : "Cerrado",
    aviso: abre
      ? `${fin(`Cerrado, abrimos ${abre}`)} Puedes ver el menú y armar tu pedido.`
      : "Ahora estamos cerrados. Puedes ver el menú, pero no recibimos pedidos.",
  };
}
