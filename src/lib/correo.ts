import "server-only";
import { Resend } from "resend";
import type { Ajustes, TipoPedido } from "@/lib/tipos";
import { cop, fechaLarga, horaDe } from "@/lib/formato";
import { urlSitio } from "@/lib/sitio";

type PedidoCorreo = {
  id: string;
  daily_number: number;
  customer_name: string;
  customer_email: string;
  order_type: TipoPedido;
  address: string | null;
  pickup_at: string | null;
  total: number;
  payment_method: "efectivo" | "transferencia";
  order_items: { product_name: string; quantity: number }[];
};

type RestauranteCorreo = Pick<Ajustes, "name" | "tagline" | "domain" | "mascot" | "address" | "timezone">;

const escapar = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * Avisa al cliente por correo que su pedido va en camino o que está listo para recoger.
 * Devuelve true si se envió.
 */
export async function enviarCorreoEstado(
  estado: "en_camino" | "listo_recoger",
  p: PedidoCorreo,
  r: RestauranteCorreo,
): Promise<boolean> {
  const clave = process.env.RESEND_API_KEY;
  if (!clave) {
    console.warn("RESEND_API_KEY no está configurada: no se envió el correo.");
    return false;
  }
  // Cada restaurante usa su dominio si lo tiene; si no, la dirección general de la plataforma.
  const sitio = r.domain ? `https://${r.domain}` : urlSitio();
  // El correo de envío es el de la plataforma; el nombre que ve el cliente es el del restaurante.
  const configurado = process.env.CORREO_REMITENTE ?? "onboarding@resend.dev";
  const direccion = configurado.match(/<([^>]+)>/)?.[1] ?? configurado;
  const remitente = `${r.name.replace(/[<>"]/g, "")} <${direccion}>`;
  const nombre = p.customer_name.split(" ")[0];
  const enlace = `${sitio}/pedido/${p.id}`;

  const recoger = estado === "listo_recoger";
  const titulo = recoger ? `¡${nombre}, tu pedido está listo!` : `¡${nombre}, tu pedido va en camino!`;
  const asunto = recoger ? `Tu pedido #${p.daily_number} está listo para recoger` : `Tu pedido #${p.daily_number} va en camino`;
  const lugar = recoger
    ? `Recógelo en ${r.address ?? r.name}${p.pickup_at ? ` · hacia las ${horaDe(p.pickup_at, r.timezone)}` : ""}`
    : `Llega a ${p.address ?? ""}`;
  const pago = `Pagas al ${recoger ? "recoger" : "recibir"} en ${p.payment_method === "efectivo" ? "efectivo" : "transferencia"}.`;
  const imagen = recoger ? "libreta.png" : "libreta.png"; // cambia cuando lleguen las poses "recoger" y "moto"

  const items = p.order_items
    .map((i) => `<tr><td style="padding:4px 0">${i.quantity}× ${escapar(i.product_name)}</td></tr>`)
    .join("");

  const html = `<!doctype html>
<html lang="es"><body style="margin:0;background:#fff8ec;font-family:Arial,Helvetica,sans-serif;color:#1e1a17">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff8ec;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:2px solid #1e1a17;border-radius:24px">
        <tr><td style="padding:28px 24px 8px;text-align:center">
          <img src="${sitio}/${r.mascot}/${imagen}" width="120" alt="" style="display:block;margin:0 auto 12px;height:auto">
          <h1 style="margin:0;font-size:26px;line-height:1.15">${escapar(titulo)}</h1>
          <p style="margin:10px 0 0;color:#6b5c50;font-size:15px">Pedido #${p.daily_number} · ${escapar(lugar)}</p>
        </td></tr>
        <tr><td style="padding:16px 24px">
          <table role="presentation" width="100%" style="font-size:15px;border-top:2px solid #ecdcc0;border-bottom:2px solid #ecdcc0;padding:8px 0">${items}</table>
          <p style="margin:12px 0 0;font-size:18px;font-weight:bold">Total: ${cop(p.total)}</p>
          <p style="margin:4px 0 0;color:#6b5c50;font-size:14px">${pago}</p>
        </td></tr>
        <tr><td style="padding:8px 24px 28px;text-align:center">
          <a href="${enlace}" style="display:inline-block;background:#ee9a4d;color:#1e1a17;border:2px solid #1e1a17;border-radius:999px;padding:14px 24px;font-weight:bold;text-decoration:none">Ver mi pedido</a>
        </td></tr>
      </table>
      <p style="color:#6b5c50;font-size:12px;margin:16px 0 0">${escapar(r.name)}${r.tagline ? ` · ${escapar(r.tagline)}` : ""}</p>
    </td></tr>
  </table>
</body></html>`;

  const resend = new Resend(clave);
  const { error } = await resend.emails.send({
    from: remitente,
    to: p.customer_email,
    subject: asunto,
    html,
    text: `${titulo} Pedido #${p.daily_number}. ${lugar}. Total: ${cop(p.total)}. ${pago} Míralo aquí: ${enlace}`,
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
  const configurado = process.env.CORREO_REMITENTE ?? "onboarding@resend.dev";
  const direccion = configurado.match(/<([^>]+)>/)?.[1] ?? configurado;
  const remitente = `${r.name.replace(/[<>"]/g, "")} <${direccion}>`;
  const nombre = v.name.split(" ")[0];
  const cuando = `${fechaLarga(v.slot_start, r.timezone)} a las ${horaDe(v.slot_start, r.timezone)}`;
  const personas = `${v.party_size} ${v.party_size === 1 ? "persona" : "personas"}`;
  const confirmada = v.status === "confirmada";
  const titulo = confirmada ? `¡${nombre}, tu reserva está confirmada!` : `¡${nombre}, recibimos tu reserva!`;
  const detalle = confirmada ? "Te esperamos." : "El restaurante la confirmará pronto.";

  const html = `<!doctype html>
<html lang="es"><body style="margin:0;background:#fff8ec;font-family:Arial,Helvetica,sans-serif;color:#1e1a17">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff8ec;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:2px solid #1e1a17;border-radius:24px">
        <tr><td style="padding:28px 24px 8px;text-align:center">
          <h1 style="margin:0;font-size:26px;line-height:1.15">${escapar(titulo)}</h1>
          <p style="margin:14px 0 0;font-size:18px;font-weight:bold">${escapar(cuando)}</p>
          <p style="margin:4px 0 0;color:#6b5c50;font-size:15px">${escapar(personas)} · ${escapar(r.name)}${r.address ? ` · ${escapar(r.address)}` : ""}</p>
          <p style="margin:12px 0 0;color:#6b5c50;font-size:15px">${detalle}</p>
        </td></tr>
        <tr><td style="padding:16px 24px 28px;text-align:center">
          <a href="${enlace}" style="display:inline-block;background:#ffffff;color:#1e1a17;border:2px solid #1e1a17;border-radius:999px;padding:12px 22px;font-weight:bold;text-decoration:none">Ver o cancelar mi reserva</a>
        </td></tr>
      </table>
      <p style="color:#6b5c50;font-size:12px;margin:16px 0 0">${escapar(r.name)}${r.tagline ? ` · ${escapar(r.tagline)}` : ""}</p>
    </td></tr>
  </table>
</body></html>`;

  const resend = new Resend(clave);
  const { error } = await resend.emails.send({
    from: remitente,
    to: v.email,
    subject: confirmada ? `Reserva confirmada: ${cuando}` : `Recibimos tu reserva: ${cuando}`,
    html,
    text: `${titulo} ${cuando}, ${personas}. ${detalle} Para ver o cancelar: ${enlace}`,
  });
  if (error) {
    console.error("Resend:", error);
    return false;
  }
  return true;
}
