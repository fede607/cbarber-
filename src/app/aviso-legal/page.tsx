import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { appUrl } from "@/lib/email";
import { Shell } from "@/components/site/Shell";

export const metadata: Metadata = { title: "Aviso legal", alternates: { canonical: "/aviso-legal" } };

export default async function Page() {
  const s = await getSettings();
  return (
    <Shell>
      <article className="prose-legal mx-auto max-w-3xl">
        <p className="eyebrow mb-4">Legal</p>
        <h1 className="display mb-8 text-5xl md:text-6xl">Aviso legal</h1>

        <h2>Titular de la web</h2>
        <p>En cumplimiento del artículo 10 de la Ley 34/2002, de Servicios de la Sociedad de la Información y de Comercio Electrónico, se informa de los datos del titular:</p>
        <ul>
          <li>Titular: {s.legalOwnerName}</li>
          <li>NIF: {s.legalOwnerId}</li>
          <li>Domicilio: {s.legalAddress}</li>
          <li>
            Email: <a href={`mailto:${s.contactEmail}`}>{s.contactEmail}</a>
          </li>
          <li>Teléfono: {s.phone}</li>
          <li>Sitio web: {appUrl()}</li>
        </ul>

        <h2>Objeto</h2>
        <p>Esta web informa sobre los servicios de {s.businessName} y permite reservar, cambiar y cancelar citas. Reservar es gratuito. El precio depende del servicio, se informa en el establecimiento antes de empezar y se paga allí en efectivo.</p>

        <h2>Reservas y cancelaciones</h2>
        <p>
          Al confirmar una reserva, la hora queda bloqueada para ti. Puedes cambiarla o cancelarla desde el enlace del email de confirmación hasta {Math.round(s.cancelLimitMin / 60)} horas antes de la cita.
          Después de ese plazo, contacta por teléfono.
        </p>

        <h2>Propiedad intelectual</h2>
        <p>Los textos, las fotografías y el diseño de esta web pertenecen a su titular o se usan con autorización. No se permite reproducirlos sin permiso.</p>

        <h2>Responsabilidad</h2>
        <p>El titular procura que la información esté actualizada y que la web funcione sin interrupciones, pero no puede garantizar la ausencia total de errores o caídas ajenas a su control.</p>

        <h2>Legislación aplicable</h2>
        <p>Este aviso se rige por la legislación española. Si eres consumidor, cualquier controversia se someterá a los juzgados de tu domicilio.</p>
      </article>
    </Shell>
  );
}
