import "server-only";
import { Resend } from "resend";
import type { Ajustes } from "@/lib/tipos";
import { cop } from "@/lib/formato";
import { urlSitio } from "@/lib/sitio";

type PedidoCorreo = {
  id: string;
  daily_number: number;
  customer_name: string;
  customer_email: string;
  address: string;
  total: number;
  payment_method: "efectivo" | "transferencia";
  order_items: { product_name: string; quantity: number }[];
};

const escapar = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Envía "Tu pedido va en camino". Devuelve true si se envió. */
export async function enviarCorreoDespacho(
  p: PedidoCorreo,
  r: Pick<Ajustes, "name" | "tagline" | "domain" | "mascot">,
): Promise<boolean> {
  const clave = process.env.RESEND_API_KEY;
  if (!clave) {
    console.warn("RESEND_API_KEY no está configurada: no se envió el correo.");
    return false;
  }
  // Cada restaurante usa su dominio si lo tiene; si no, la dirección general de la plataforma.
  const sitio = r.domain ? `https://${r.domain}` : urlSitio();
  // El correo de envío es el de la plataforma; el nombre que ve el cliente es el del restaurante.
  const direccion = (process.env.CORREO_REMITENTE ?? "onboarding@resend.dev").match(/<([^>]+)>/)?.[1] ?? process.env.CORREO_REMITENTE ?? "onboarding@resend.dev";
  const remitente = `${r.name.replace(/[<>"]/g, "")} <${direccion}>`;
  const nombre = escapar(p.customer_name.split(" ")[0]);
  const enlace = sitio ? `${sitio}/pedido/${p.id}` : null;

  const items = p.order_items
    .map((i) => `<tr><td style="padding:4px 0">${i.quantity}× ${escapar(i.product_name)}</td></tr>`)
    .join("");

  const html = `<!doctype html>
<html lang="es"><body style="margin:0;background:#fff8ec;font-family:Arial,Helvetica,sans-serif;color:#1e1a17">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff8ec;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:2px solid #1e1a17;border-radius:24px">
        <tr><td style="padding:28px 24px 8px;text-align:center">
          ${sitio ? `<img src="${sitio}/${r.mascot}/libreta.png" width="120" alt="Tato" style="display:block;margin:0 auto 12px;height:auto">` : ""}
          <h1 style="margin:0;font-size:26px;line-height:1.15">¡${nombre}, tu pedido va en camino!</h1>
          <p style="margin:10px 0 0;color:#6b5c50;font-size:15px">Pedido #${p.daily_number} · Llega a ${escapar(p.address)}</p>
        </td></tr>
        <tr><td style="padding:16px 24px">
          <table role="presentation" width="100%" style="font-size:15px;border-top:2px solid #ecdcc0;border-bottom:2px solid #ecdcc0;padding:8px 0">${items}</table>
          <p style="margin:12px 0 0;font-size:18px;font-weight:bold">Total: ${cop(p.total)}</p>
          <p style="margin:4px 0 0;color:#6b5c50;font-size:14px">Pagas al recibir en ${p.payment_method === "efectivo" ? "efectivo" : "transferencia"}.</p>
        </td></tr>
        ${
          enlace
            ? `<tr><td style="padding:8px 24px 28px;text-align:center">
          <a href="${enlace}" style="display:inline-block;background:#ee9a4d;color:#1e1a17;border:2px solid #1e1a17;border-radius:999px;padding:14px 24px;font-weight:bold;text-decoration:none">Ver mi pedido</a>
        </td></tr>`
            : ""
        }
      </table>
      <p style="color:#6b5c50;font-size:12px;margin:16px 0 0">${escapar(r.name)}${r.tagline ? ` · ${escapar(r.tagline)}` : ""}</p>
    </td></tr>
  </table>
</body></html>`;

  const resend = new Resend(clave);
  const { error } = await resend.emails.send({
    from: remitente,
    to: p.customer_email,
    subject: `Tu pedido #${p.daily_number} va en camino`,
    html,
    text: `¡${p.customer_name.split(" ")[0]}, tu pedido #${p.daily_number} va en camino! Total: ${cop(p.total)}. Pagas al recibir.${enlace ? ` Míralo aquí: ${enlace}` : ""}`,
  });
  if (error) {
    console.error("Resend:", error);
    return false;
  }
  return true;
}
