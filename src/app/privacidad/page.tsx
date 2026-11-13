import type { Metadata } from "next";
import Link from "next/link";
import { Encabezado } from "@/components/encabezado";
import { AvisoDemo } from "@/components/aviso-demo";
import { Atras } from "@/components/iconos";
import { obtenerAjustes } from "@/lib/menu";

export const metadata: Metadata = { title: "Política de privacidad" };

/**
 * Plantilla de política de tratamiento de datos personales (Ley 1581 de 2012 y Decreto 1377 de 2013).
 * Se completa sola con los datos del restaurante en la tabla `settings`.
 * Es una plantilla: conviene que un abogado la revise antes de usarla con clientes reales.
 */
export default async function Privacidad() {
  const a = await obtenerAjustes();
  const responsable = a.legal_name || a.name;
  const canal = a.privacy_email
    ? { texto: `al correo ${a.privacy_email}`, href: `mailto:${a.privacy_email}` }
    : a.whatsapp
      ? { texto: "por WhatsApp", href: `https://wa.me/${a.whatsapp}` }
      : null;
  const vigencia = new Intl.DateTimeFormat("es-CO", { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(`${a.privacy_version}T12:00:00Z`),
  );

  return (
    <>
      <Encabezado>
        <Link href="/" className="flex items-center gap-1.5 text-sm font-bold">
          <Atras /> Menú
        </Link>
      </Encabezado>
      <AvisoDemo ajustes={a} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-8 pb-16">
        <h1 className="font-display text-4xl leading-tight md:text-5xl">Política de privacidad</h1>
        <p className="mt-2 text-sm text-ink-soft">Vigente desde el {vigencia}.</p>

        <div className="mt-8 space-y-7 text-[15px] leading-relaxed [&_h2]:font-display [&_h2]:text-2xl [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
          <section>
            <h2>Quién es el responsable</h2>
            <p className="mt-2">
              {[
                responsable,
                a.legal_id && `identificado con NIT o cédula ${a.legal_id}`,
                a.address && `con domicilio en ${a.address}`,
              ]
                .filter(Boolean)
                .join(", ")}
              {a.legal_id || a.address ? "," : ""} es el responsable del tratamiento de los datos personales que recoge
              esta página, de acuerdo con la Ley 1581 de 2012 y sus decretos reglamentarios.
            </p>
          </section>

          <section>
            <h2>Qué datos recogemos</h2>
            <ul>
              <li>Nombre y celular; el correo electrónico, solo si decides dejarlo.</li>
              <li>Una huella técnica de tu conexión (no tu dirección IP), solo para evitar pedidos falsos.</li>
              <li>Dirección e indicaciones de entrega.</li>
              <li>Los platos que pides, la forma de pago y la fecha y hora del pedido.</li>
            </ul>
            <p className="mt-2">No pedimos datos sensibles ni datos de tarjetas. No creamos cuentas de usuario.</p>
          </section>

          <section>
            <h2>Para qué los usamos</h2>
            <ul>
              <li>Preparar y entregar tu pedido, y llamarte si hace falta.</li>
              <li>Avisarte por correo el estado de tu pedido.</li>
              <li>Atender quejas, reclamos y solicitudes sobre tus datos.</li>
              <li>Cumplir obligaciones legales y contables.</li>
            </ul>
            <p className="mt-2">No vendemos ni compartimos tus datos con terceros para publicidad.</p>
          </section>

          <section>
            <h2>Tus derechos</h2>
            <p className="mt-2">Como titular de los datos puedes, en cualquier momento:</p>
            <ul>
              <li>Conocer, actualizar y rectificar tus datos.</li>
              <li>Pedir prueba de la autorización que nos diste.</li>
              <li>Saber cómo hemos usado tus datos.</li>
              <li>Revocar la autorización y pedir que borremos tus datos, cuando no exista un deber legal de conservarlos.</li>
              <li>Presentar quejas ante la Superintendencia de Industria y Comercio.</li>
              <li>Acceder gratis a tus datos.</li>
            </ul>
          </section>

          <section>
            <h2>Cómo ejercerlos</h2>
            <p className="mt-2">
              Escríbenos{" "}
              {canal ? (
                <a href={canal.href} className="font-semibold underline underline-offset-2">
                  {canal.texto}
                </a>
              ) : (
                "por los canales de contacto del restaurante"
              )}{" "}
              indicando tu nombre, tu celular y lo que necesitas. Respondemos las consultas en máximo 10 días hábiles y
              los reclamos en máximo 15 días hábiles, como indica la ley.
            </p>
          </section>

          <section>
            <h2>Dónde se guardan</h2>
            <p className="mt-2">
              Usamos proveedores tecnológicos que guardan y procesan la información por encargo nuestro, algunos con
              servidores fuera de Colombia: Supabase (base de datos), Vercel (alojamiento de la página) y Resend (envío
              de correos). Les exigimos medidas de seguridad adecuadas y solo tratan los datos para prestarnos su
              servicio.
            </p>
          </section>

          <section>
            <h2>Cuánto tiempo los conservamos</h2>
            <p className="mt-2">
              Mientras sean necesarios para las finalidades descritas y durante los plazos que exijan las normas
              contables y tributarias. Después los eliminamos.
            </p>
          </section>

          <section>
            <h2>Tu autorización</h2>
            <p className="mt-2">
              Al marcar la casilla de autorización en el formulario de pedido, nos autorizas de forma previa, expresa e
              informada a tratar tus datos según esta política. Guardamos la fecha, la hora y la versión de la política
              que aceptaste.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
