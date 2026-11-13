import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/auth";
import { db } from "@/lib/db";
import { dateStrOf, formatDateTime, formatDuration, formatPrice, formatShortDate, timeStrOf } from "@/lib/time";
import { F, Flash, PageTitle, Section, StatusBadge } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { setStatusAction, updateAppointmentAction } from "../../../actions";

export const metadata = { title: "Reserva" };

const EMAIL = { confirmation: "Confirmación", cancellation: "Cancelación", reschedule: "Cambio de hora", reminder: "Recordatorio", admin_notice: "Aviso interno" } as Record<string, string>;
const EMAIL_STATUS = { sent: "Enviado", failed: "Falló", not_configured: "No enviado (email sin configurar)" } as Record<string, string>;

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const a = await db.appointment.findUnique({ where: { id }, include: { customer: true, emails: { orderBy: { createdAt: "desc" } } } });
  if (!a) notFound();
  const services = await db.service.findMany({ where: { OR: [{ deletedAt: null }, { id: a.serviceId }] }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  const returnTo = `/admin/reservas/${a.id}`;

  const statusForm = (status: string, label: string, cls = "btn btn-ghost btn-sm", confirm?: string) => (
    <form action={setStatusAction} key={status}>
      <input type="hidden" name="id" value={a.id} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="notify" value="true" />
      <input type="hidden" name="returnTo" value={returnTo} />
      {confirm ? (
        <ConfirmButton message={confirm} className={cls}>
          {label}
        </ConfirmButton>
      ) : (
        <button className={cls}>{label}</button>
      )}
    </form>
  );

  return (
    <>
      <PageTitle title={a.customer.name} intro={`${a.serviceName} · ${formatDateTime(a.startsAt)}`}>
        <StatusBadge status={a.status} />
      </PageTitle>
      <Flash sp={sp} />

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div>
          <Section title="Cita" intro="Si cambias el día, la hora o el servicio, el sistema comprueba que no pise otra cita.">
            <form action={updateAppointmentAction} className="grid gap-5 md:grid-cols-2">
              <input type="hidden" name="id" value={a.id} />
              <F label="Servicio" className="md:col-span-2">
                <select name="serviceId" defaultValue={a.serviceId} className="field" disabled={a.status === "CANCELLED"}>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} · {formatDuration(s.durationMin)} · {formatPrice(s.priceCents)}
                    </option>
                  ))}
                </select>
              </F>
              <F label="Día">
                <input type="date" name="date" defaultValue={dateStrOf(a.startsAt)} required className="field" disabled={a.status === "CANCELLED"} />
              </F>
              <F label="Hora">
                <input type="time" name="time" defaultValue={timeStrOf(a.startsAt)} required step={300} className="field" disabled={a.status === "CANCELLED"} />
              </F>
              <F label="Notas internas" className="md:col-span-2">
                <textarea name="notes" defaultValue={a.notes} maxLength={500} className="field" disabled={a.status === "CANCELLED"} />
              </F>
              <label className="flex items-center gap-3 text-sm md:col-span-2">
                <input type="checkbox" name="notify" defaultChecked className="h-5 w-5 accent-[#c6a15b]" />
                Avisar al cliente por email si cambia la hora
              </label>
              <div className="flex flex-wrap gap-3 md:col-span-2">
                <button className="btn btn-primary" disabled={a.status === "CANCELLED"}>
                  Guardar cambios
                </button>
                <Link href="/admin/reservas" className="btn btn-ghost">
                  Volver a reservas
                </Link>
              </div>
            </form>
          </Section>

          <Section title="Estado">
            <div className="flex flex-wrap gap-3">
              {a.status !== "COMPLETED" && a.status !== "CANCELLED" && statusForm("COMPLETED", "Marcar como completada", "btn btn-primary btn-sm")}
              {a.status === "PENDING" && statusForm("NO_SHOW", "No se presentó")}
              {a.status !== "PENDING" && statusForm("PENDING", "Volver a pendiente")}
              {a.status !== "CANCELLED" && statusForm("CANCELLED", "Cancelar cita", "btn btn-danger btn-sm", "¿Cancelar esta cita? Se avisará al cliente por email.")}
            </div>
          </Section>
        </div>

        <div>
          <Section title="Cliente">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-ash">Teléfono</dt>
                <dd className="num text-base">
                  <a href={`tel:${a.customer.phone}`} className="hover:text-brass">
                    {a.customer.phone || "—"}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-ash">Email</dt>
                <dd className="break-all text-base">{a.customer.email}</dd>
              </div>
              <div>
                <dt className="text-ash">Reservada</dt>
                <dd>
                  {formatShortDate(a.createdAt)} · {a.source === "WEB" ? "desde la web" : "por ti"}
                </dd>
              </div>
              <div>
                <dt className="text-ash">Precio guardado</dt>
                <dd className="num">{formatPrice(a.priceCents)}</dd>
              </div>
            </dl>
          </Section>
          <Section title="Emails de esta cita">
            {a.emails.length === 0 ? (
              <p className="text-sm text-ash">Todavía no se ha enviado ninguno.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {a.emails.map((e) => (
                  <li key={e.id}>
                    <span className={e.status === "sent" ? "text-ok" : e.status === "failed" ? "text-danger" : "text-brass"}>{EMAIL_STATUS[e.status] ?? e.status}</span> · {EMAIL[e.type] ?? e.type}
                    <div className="text-xs text-ash">
                      {formatShortDate(e.createdAt)} {timeStrOf(e.createdAt)}
                      {e.error ? ` · ${e.error}` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </>
  );
}
