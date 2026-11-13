import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { Shell } from "@/components/site/Shell";

export const metadata: Metadata = { title: "Política de privacidad", alternates: { canonical: "/privacidad" } };

export default async function Page() {
  const s = await getSettings();
  const months = Number(process.env.RETENTION_MONTHS ?? 24);
  return (
    <Shell>
      <article className="prose-legal mx-auto max-w-3xl">
        <p className="eyebrow mb-4">Legal</p>
        <h1 className="display mb-8 text-5xl md:text-6xl">Política de privacidad</h1>

        <h2>Quién es el responsable de tus datos</h2>
        <p>
          {s.legalOwnerName}, con NIF {s.legalOwnerId} y domicilio en {s.legalAddress} («{s.businessName}»). Puedes escribir a{" "}
          <a href={`mailto:${s.contactEmail}`}>{s.contactEmail}</a> para cualquier asunto sobre tus datos.
        </p>

        <h2>Qué datos se recogen y para qué</h2>
        <p>Cuando reservas una cita se guardan tu nombre, tu teléfono, tu email, el servicio y el día y la hora elegidos. Se usan únicamente para:</p>
        <ul>
          <li>gestionar tu cita y dejar esa hora reservada para ti;</li>
          <li>enviarte la confirmación, los avisos de cambio o cancelación y un recordatorio el día anterior;</li>
          <li>llamarte si surge un imprevisto con tu cita.</li>
        </ul>
        <p>No se envía publicidad, no se elaboran perfiles y no se toman decisiones automatizadas sobre ti.</p>

        <h2>Base legal</h2>
        <p>
          El tratamiento es necesario para prestarte el servicio que pides al reservar (art. 6.1.b del Reglamento General de Protección de Datos) y se apoya en el consentimiento que das al marcar la casilla del
          formulario (art. 6.1.a), que puedes retirar cuando quieras.
        </p>

        <h2>Cuánto tiempo se conservan</h2>
        <p>
          Tus datos se conservan mientras tengas citas y hasta {months} meses después de la última. Pasado ese plazo se anonimizan automáticamente: se borran tu nombre, tu teléfono y tu email, y solo queda el
          registro de la cita sin identificar, con fines estadísticos y contables.
        </p>

        <h2>Quién más accede a los datos</h2>
        <p>No se ceden a terceros. Para que la web funcione se usan estos proveedores, que actúan como encargados del tratamiento siguiendo instrucciones del responsable:</p>
        <ul>
          <li>Vercel Inc. (alojamiento de la web);</li>
          <li>Neon Inc. (base de datos, alojada en la Unión Europea);</li>
          <li>Resend Inc. (envío de los emails de la cita).</li>
        </ul>
        <p>Algunos de estos proveedores tienen sede en Estados Unidos. Las transferencias se amparan en el Marco de Privacidad de Datos UE-EE. UU. o en cláusulas contractuales tipo aprobadas por la Comisión Europea.</p>

        <h2>Tus derechos</h2>
        <p>
          Puedes pedir el acceso a tus datos, su rectificación o supresión, la limitación u oposición a su tratamiento y su portabilidad, así como retirar tu consentimiento, escribiendo a{" "}
          <a href={`mailto:${s.contactEmail}`}>{s.contactEmail}</a>. Responderemos en el plazo máximo de un mes. Si crees que no se ha atendido bien tu solicitud, puedes reclamar ante la Agencia Española de
          Protección de Datos (<a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">www.aepd.es</a>).
        </p>

        <h2>Seguridad</h2>
        <p>La web funciona siempre con conexión cifrada (HTTPS). Los datos de los clientes solo son accesibles desde un panel privado protegido con contraseña y verificación en dos pasos.</p>

        <h2 id="cookies">Cookies</h2>
        <p>
          Esta web no usa cookies de publicidad ni de analítica y no rastrea tu navegación, por lo que no necesita mostrarte un aviso de cookies. Solo se usa una cookie técnica de sesión cuando el titular entra
          en su panel privado. El mapa de la sección de ubicación es de OpenStreetMap y solo se carga si pulsas «Ver el mapa»; en ese momento tu navegador se conecta a sus servidores.
        </p>

        <p className="mt-10 text-sm">Última actualización: {new Intl.DateTimeFormat("es-ES", { dateStyle: "long" }).format(s.updatedAt)}.</p>
      </article>
    </Shell>
  );
}
