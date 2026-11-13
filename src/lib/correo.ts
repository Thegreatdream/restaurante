import "server-only";
import { Resend } from "resend";
import type { Ajustes, TipoPedido } from "@/lib/tipos";
import { cop, fechaLarga, horaDe } from "@/lib/formato";
import { urlSitio } from "@/lib/sitio";

type PedidoCorreo = {
  id: string;
  daily_number: number;
  customer_name: string;
  /** Opcional: sin correo no se envía ningún aviso. */
  customer_email: string | null;
  order_type: TipoPedido;
  address: string | null;
  pickup_at: string | null;
  total: number;
  payment_method: "efectivo" | "transferencia" | null;
  order_items: { product_name: string; quantity: number }[];
};

type RestauranteCorreo = Pick<Ajustes, "name" | "tagline" | "domain" | "address" | "timezone">;

const escapar = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// Paleta de la casa (la misma de la página): marfil, verde bosque, mostaza y líneas finas.
const C = {
  fondo: "#f6f1e7",
  tarjeta: "#fffcf6",
  linea: "#e4dbc8",
  tinta: "#1f2420",
  suave: "#5e6158",
  verde: "#1c2b24",
  marfil: "#f4ecdc",
  mostaza: "#c9973f",
};
const SERIF = "Georgia,'Times New Roman',serif";
const SANS = "'Helvetica Neue',Helvetica,Arial,sans-serif";

/** Botón principal: mostaza, letras espaciadas, esquinas suaves. */
const boton = (enlace: string, texto: string) =>
  `<a href="${enlace}" style="display:inline-block;background:${C.mostaza};color:#1e1a17;border-radius:6px;padding:15px 28px;font-family:${SANS};font-size:13px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;text-decoration:none">${escapar(texto)}</a>`;

/** Marco común de los correos: franja verde con el nombre, tarjeta marfil y pie discreto. */
function plantilla(r: RestauranteCorreo, cuerpo: string) {
  return `<!doctype html>
<html lang="es"><body style="margin:0;background:${C.fondo};font-family:${SANS};color:${C.tinta}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.fondo};padding:28px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:${C.tarjeta};border:1px solid ${C.linea};border-radius:8px;overflow:hidden">
        <tr><td style="background:${C.verde};padding:26px 24px 22px;text-align:center">
          <p style="margin:0;font-family:${SANS};font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${C.mostaza}">Almuerzos caseros</p>
          <p style="margin:8px 0 0;font-family:${SERIF};font-size:26px;letter-spacing:3px;text-transform:uppercase;color:${C.marfil}">${escapar(r.name)}</p>
        </td></tr>
        ${cuerpo}
      </table>
      <p style="color:${C.suave};font-size:12px;margin:18px 0 0">${escapar(r.name)}${r.tagline ? ` · ${escapar(r.tagline)}` : ""}</p>
    </td></tr>
  </table>
</body></html>`;
}

function remitenteDe(r: RestauranteCorreo) {
  // El correo de envío es el de la plataforma; el nombre que ve el cliente es el del restaurante.
  const configurado = process.env.CORREO_REMITENTE ?? "onboarding@resend.dev";
  const direccion = configurado.match(/<([^>]+)>/)?.[1] ?? configurado;
  return `${r.name.replace(/[<>"]/g, "")} <${direccion}>`;
}

/**
 * Avisa al cliente por correo que su pedido va en camino o que está listo para recoger.
 * Devuelve true si se envió (false si el cliente no dejó correo).
 */
export async function enviarCorreoEstado(
  estado: "en_camino" | "listo_recoger",
  p: PedidoCorreo,
  r: RestauranteCorreo,
): Promise<boolean> {
  if (!p.customer_email) return false;
  const clave = process.env.RESEND_API_KEY;
  if (!clave) {
    console.warn("RESEND_API_KEY no está configurada: no se envió el correo.");
    return false;
  }
  // Cada restaurante usa su dominio si lo tiene; si no, la dirección general de la plataforma.
  const sitio = r.domain ? `https://${r.domain}` : urlSitio();
  const nombre = p.customer_name.split(" ")[0];
  const enlace = `${sitio}/pedido/${p.id}`;

  const recoger = estado === "listo_recoger";
  const titulo = recoger ? `${nombre}, tu pedido está listo` : `${nombre}, tu pedido va en camino`;
  const asunto = recoger ? `Tu pedido #${p.daily_number} está listo para recoger` : `Tu pedido #${p.daily_number} va en camino`;
  const lugar = recoger
    ? `Recógelo en ${r.address ?? r.name}${p.pickup_at ? ` · hacia las ${horaDe(p.pickup_at, r.timezone)}` : ""}`
    : `Llega a ${p.address ?? ""}`;
  const pago = `Pagas al ${recoger ? "recoger" : "recibir"}${p.payment_method ? ` en ${p.payment_method === "efectivo" ? "efectivo" : "transferencia"}` : ""}.`;

  const items = p.order_items
    .map(
      (i) =>
        `<tr><td style="padding:7px 0;border-bottom:1px solid ${C.linea};font-size:15px"><strong>${i.quantity}×</strong> ${escapar(i.product_name)}</td></tr>`,
    )
    .join("");

  const html = plantilla(
    r,
    `<tr><td style="padding:30px 24px 6px;text-align:center">
          <p style="margin:0;font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:${C.suave}">Pedido #${p.daily_number}</p>
          <h1 style="margin:10px 0 0;font-family:${SERIF};font-size:28px;line-height:1.2;font-weight:normal;color:${C.tinta}">${escapar(titulo)}</h1>
          <p style="margin:12px 0 0;color:${C.suave};font-size:15px;line-height:1.5">${escapar(lugar)}</p>
        </td></tr>
        <tr><td style="padding:18px 24px 4px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${C.linea}">${items}</table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px">
            <tr>
              <td style="font-size:17px;font-weight:bold">Total</td>
              <td align="right" style="font-size:17px;font-weight:bold">${cop(p.total)}</td>
            </tr>
          </table>
          <p style="margin:6px 0 0;color:${C.suave};font-size:14px">${pago}</p>
        </td></tr>
        <tr><td style="padding:22px 24px 32px;text-align:center">${boton(enlace, "Ver mi pedido")}</td></tr>`,
  );

  const resend = new Resend(clave);
  const { error } = await resend.emails.send({
    from: remitenteDe(r),
    to: p.customer_email,
    subject: asunto,
    html,
    text: `${titulo}. Pedido #${p.daily_number}. ${lugar}. Total: ${cop(p.total)}. ${pago} Míralo aquí: ${enlace}`,
  });
  if (error) {
    console.error("Resend:", error);
    return false;
  }
  return true;
}

/** Confirmación de reserva con el link para cancelarla. Devuelve true si se envió. */
export async function enviarCorreoReserva(
  v: { status: "pendiente" | "confirmada"; slot_start: string; party_size: number; name: string; email: string },
  r: RestauranteCorreo,
  enlace: string,
): Promise<boolean> {
  const clave = process.env.RESEND_API_KEY;
  if (!clave) {
    console.warn("RESEND_API_KEY no está configurada: no se envió el correo.");
    return false;
  }
  const nombre = v.name.split(" ")[0];
  const cuando = `${fechaLarga(v.slot_start, r.timezone)} a las ${horaDe(v.slot_start, r.timezone)}`;
  const personas = `${v.party_size} ${v.party_size === 1 ? "persona" : "personas"}`;
  const confirmada = v.status === "confirmada";
  const titulo = confirmada ? `${nombre}, tu reserva está confirmada` : `${nombre}, recibimos tu reserva`;
  const detalle = confirmada ? "Te esperamos." : "El restaurante la confirmará pronto.";

  const html = plantilla(
    r,
    `<tr><td style="padding:30px 24px 6px;text-align:center">
          <p style="margin:0;font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:${C.suave}">Reserva de mesa</p>
          <h1 style="margin:10px 0 0;font-family:${SERIF};font-size:28px;line-height:1.2;font-weight:normal;color:${C.tinta}">${escapar(titulo)}</h1>
        </td></tr>
        <tr><td style="padding:16px 24px 0">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${C.linea};border-bottom:1px solid ${C.linea}">
            <tr><td style="padding:16px 0;text-align:center">
              <p style="margin:0;font-family:${SERIF};font-size:20px;color:${C.tinta}">${escapar(cuando)}</p>
              <p style="margin:6px 0 0;color:${C.suave};font-size:15px">${escapar(personas)}${r.address ? ` · ${escapar(r.address)}` : ""}</p>
            </td></tr>
          </table>
          <p style="margin:14px 0 0;color:${C.suave};font-size:15px;text-align:center">${detalle}</p>
        </td></tr>
        <tr><td style="padding:22px 24px 32px;text-align:center">${boton(enlace, "Ver o cancelar mi reserva")}</td></tr>`,
  );

  const resend = new Resend(clave);
  const { error } = await resend.emails.send({
    from: remitenteDe(r),
    to: v.email,
    subject: confirmada ? `Reserva confirmada: ${cuando}` : `Recibimos tu reserva: ${cuando}`,
    html,
    text: `${titulo}. ${cuando}, ${personas}. ${detalle} Para ver o cancelar: ${enlace}`,
  });
  if (error) {
    console.error("Resend:", error);
    return false;
  }
  return true;
}
