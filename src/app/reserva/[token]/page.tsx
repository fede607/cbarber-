import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { findByToken } from "@/lib/booking";
import { getSettings } from "@/lib/settings";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { isTokenShape } from "@/lib/tokens";
import { addDays, minutesUntil, formatDateTime, formatDuration, formatPrice, todayStr } from "@/lib/time";
import { Shell } from "@/components/site/Shell";
import { ManageBooking } from "@/components/booking/ManageBooking";

export const metadata: Metadata = { title: "Tu cita", robots: { index: false, follow: false }, referrer: "no-referrer" };

const STATUS = { PENDING: "Confirmada", COMPLETED: "Completada", CANCELLED: "Cancelada", NO_SHOW: "No presentada" } as const;

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  // Slows down any attempt to guess links (tokens are 256-bit, so guessing is already hopeless).
  if (!isTokenShape(token) || !(await rateLimit(`view:${await clientIp()}`, 40, 600))) notFound();
  const a = await findByToken(token);
  if (!a) notFound();
  const s = await getSettings();
  const today = todayStr();
  const canChange = a.status === "PENDING" && minutesUntil(a.startsAt) >= s.cancelLimitMin;

  return (
    <Shell>
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow mb-4">Tu cita · {STATUS[a.status]}</p>
        <h1 className="display text-4xl capitalize md:text-6xl">{formatDateTime(a.startsAt)}</h1>
        <dl className="mt-10 grid gap-x-10 gap-y-6 border-y border-line py-8 sm:grid-cols-2">
          {[
            ["Servicio", a.serviceName],
            ["Duración", formatDuration(a.durationMin)],
            ["Precio", formatPrice(a.priceCents)],
            ["A nombre de", a.customer.name],
            ["Dirección", `${s.address}, ${s.postalCity}`],
            ["Teléfono de la barbería", s.phone],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-sm text-ash">{k}</dt>
              <dd className="mt-1 text-lg">{v}</dd>
            </div>
          ))}
        </dl>
        {canChange ? (
          <ManageBooking token={token} serviceId={a.serviceId} today={today} lastDate={addDays(today, s.maxAdvanceDays)} />
        ) : (
          <div className="mt-8">
            <p className="text-ash">
              {a.status === "PENDING"
                ? `Queda poco para la cita y ya no se puede cambiar desde aquí. Llama a Carlos: ${s.phone}.`
                : a.status === "CANCELLED"
                  ? "Esta cita está cancelada."
                  : "Esta cita ya ha pasado."}
            </p>
            <Link href="/reservar" className="btn btn-primary mt-6">
              Reservar otra cita
            </Link>
          </div>
        )}
      </div>
    </Shell>
  );
}
