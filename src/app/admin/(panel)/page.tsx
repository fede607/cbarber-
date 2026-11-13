import Link from "next/link";
import { requireAdmin } from "@/auth";
import { getDashboard } from "@/lib/stats";
import { emailConfigured } from "@/lib/email";
import { formatPrice, timeStrOf } from "@/lib/time";
import { BookingsChart, RevenueChart, ServicesChart } from "@/components/admin/Charts";
import { PageTitle, StatusBadge } from "@/components/admin/ui";

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-ash">{label}</p>
      <p className="num mt-2 text-3xl">{value}</p>
      {note && <p className="mt-1 text-xs text-ash">{note}</p>}
    </div>
  );
}

export default async function Page() {
  await requireAdmin();
  const d = await getDashboard();
  return (
    <>
      <PageTitle title="Resumen" intro="Los ingresos cuentan solo las citas marcadas como completadas.">
        <Link href="/admin/reservas/nueva" className="btn btn-primary btn-sm">
          Nueva reserva
        </Link>
      </PageTitle>

      {!emailConfigured() && (
        <p className="mb-6 border border-brass/50 bg-brass/10 px-4 py-3 text-sm text-brass">
          Los emails no se están enviando: falta la clave de Resend (RESEND_API_KEY). Las reservas funcionan igual y cada email pendiente queda anotado en Seguridad.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Facturación de hoy" value={formatPrice(d.revenue.day)} />
        <Stat label="Facturación de la semana" value={formatPrice(d.revenue.week)} note="De lunes a domingo" />
        <Stat label="Facturación del mes" value={formatPrice(d.revenue.month)} note={`${formatPrice(d.revenue.expected)} más en citas pendientes`} />
        <Stat label="Reservas del mes" value={String(d.counts.total)} note="Incluye canceladas" />
        <Stat label="Citas pendientes" value={String(d.counts.pending)} note="De ahora en adelante" />
        <Stat label="Completadas este mes" value={String(d.counts.completed)} />
        <Stat label="Canceladas este mes" value={String(d.counts.cancelled)} />
        <Stat label="No presentadas este mes" value={String(d.counts.noShow)} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="card p-5">
          <h2 className="font-display mb-4 text-2xl">Ingresos, últimos 30 días</h2>
          <RevenueChart data={d.series} />
        </section>
        <section className="card p-5">
          <h2 className="font-display mb-4 text-2xl">Reservas por día, últimos 30 días</h2>
          <BookingsChart data={d.series} />
        </section>
        <section className="card p-5">
          <h2 className="font-display mb-4 text-2xl">Servicios más reservados</h2>
          {d.topServices.length ? <ServicesChart data={d.topServices} /> : <p className="text-ash">Aún no hay reservas que contar.</p>}
        </section>
        <section className="card p-5">
          <h2 className="font-display mb-4 text-2xl">Hoy</h2>
          {d.todayList.length === 0 ? (
            <p className="text-ash">Hoy no hay citas.</p>
          ) : (
            <ul>
              {d.todayList.map((a) => (
                <li key={a.id} className="border-b border-line last:border-0">
                  <Link href={`/admin/reservas/${a.id}`} className="flex items-center gap-4 py-3 hover:text-brass">
                    <span className="num w-14">{timeStrOf(a.startsAt)}</span>
                    <span className="min-w-0 flex-1 truncate">
                      {a.customer.name} <span className="text-ash">· {a.serviceName}</span>
                    </span>
                    <StatusBadge status={a.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
