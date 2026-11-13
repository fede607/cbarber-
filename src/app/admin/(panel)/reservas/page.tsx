import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireAdmin } from "@/auth";
import { db } from "@/lib/db";
import { addDays, formatPrice, formatShortDate, isDateStr, localToUtc, timeStrOf, todayStr } from "@/lib/time";
import { Empty, Flash, PageTitle, StatusBadge } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { setStatusAction } from "../../actions";

type SP = { ok?: string; error?: string; vista?: string; estado?: string; desde?: string; hasta?: string; q?: string };

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin();
  const sp = await searchParams;
  const today = todayStr();
  const vista = sp.vista ?? "proximas";
  const where: Prisma.AppointmentWhereInput = {};

  if (vista === "hoy") where.startsAt = { gte: localToUtc(today, 0), lt: localToUtc(addDays(today, 1), 0) };
  else if (vista === "proximas") where.startsAt = { gte: localToUtc(today, 0) };
  else if (vista === "pasadas") where.startsAt = { lt: localToUtc(today, 0) };
  if (isDateStr(sp.desde ?? "") || isDateStr(sp.hasta ?? ""))
    where.startsAt = { ...(isDateStr(sp.desde ?? "") ? { gte: localToUtc(sp.desde!, 0) } : {}), ...(isDateStr(sp.hasta ?? "") ? { lt: localToUtc(addDays(sp.hasta!, 1), 0) } : {}) };
  if (["PENDING", "COMPLETED", "CANCELLED", "NO_SHOW"].includes(sp.estado ?? "")) where.status = sp.estado as "PENDING";
  const q = (sp.q ?? "").trim().slice(0, 80);
  if (q) where.customer = { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] };

  const list = await db.appointment.findMany({ where, orderBy: { startsAt: vista === "pasadas" ? "desc" : "asc" }, take: 200, include: { customer: true } });
  const returnTo = `/admin/reservas?vista=${vista}`;
  const tabs = [
    ["proximas", "Próximas"],
    ["hoy", "Hoy"],
    ["pasadas", "Pasadas"],
    ["todas", "Todas"],
  ];

  return (
    <>
      <PageTitle title="Reservas">
        <Link href="/admin/reservas/nueva" className="btn btn-primary btn-sm">
          Nueva reserva
        </Link>
      </PageTitle>
      <Flash sp={sp} />

      <div className="mb-4 flex flex-wrap gap-1 border-b border-line">
        {tabs.map(([k, label]) => (
          <Link key={k} href={`/admin/reservas?vista=${k}`} aria-current={vista === k ? "page" : undefined} className={`-mb-px border-b-2 px-4 py-2.5 text-sm ${vista === k ? "border-brass text-bone" : "border-transparent text-ash hover:text-bone"}`}>
            {label}
          </Link>
        ))}
      </div>

      <form className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto]" method="get">
        <input type="hidden" name="vista" value={vista} />
        <input name="q" defaultValue={q} placeholder="Nombre, email o teléfono" aria-label="Buscar cliente" className="field" />
        <select name="estado" defaultValue={sp.estado ?? ""} aria-label="Estado" className="field">
          <option value="">Todos los estados</option>
          <option value="PENDING">Pendientes</option>
          <option value="COMPLETED">Completadas</option>
          <option value="CANCELLED">Canceladas</option>
          <option value="NO_SHOW">No presentadas</option>
        </select>
        <input type="date" name="desde" defaultValue={sp.desde} aria-label="Desde" className="field" />
        <input type="date" name="hasta" defaultValue={sp.hasta} aria-label="Hasta" className="field" />
        <button className="btn btn-ghost">Filtrar</button>
      </form>

      {list.length === 0 ? (
        <Empty href="/admin/reservas/nueva" cta="Crear una reserva">
          No hay citas con estos filtros.
        </Empty>
      ) : (
        <div className="card overflow-x-auto">
          <table className="tbl min-w-[52rem]">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Cliente</th>
                <th>Servicio</th>
                <th>Precio</th>
                <th>Estado</th>
                <th>
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id}>
                  <td className="num whitespace-nowrap">{formatShortDate(a.startsAt)}</td>
                  <td className="num">{timeStrOf(a.startsAt)}</td>
                  <td>
                    <Link href={`/admin/reservas/${a.id}`} className="font-medium hover:text-brass">
                      {a.customer.name}
                    </Link>
                    <div className="num text-xs text-ash">{a.customer.phone}</div>
                  </td>
                  <td>{a.serviceName}</td>
                  <td className="num">{formatPrice(a.priceCents)}</td>
                  <td>
                    <StatusBadge status={a.status} />
                  </td>
                  <td>
                    <div className="flex justify-end gap-2">
                      {a.status === "PENDING" && (
                        <>
                          <form action={setStatusAction}>
                            <input type="hidden" name="id" value={a.id} />
                            <input type="hidden" name="status" value="COMPLETED" />
                            <input type="hidden" name="returnTo" value={returnTo} />
                            <button className="btn btn-ghost btn-sm">Completar</button>
                          </form>
                          <form action={setStatusAction}>
                            <input type="hidden" name="id" value={a.id} />
                            <input type="hidden" name="status" value="CANCELLED" />
                            <input type="hidden" name="notify" value="true" />
                            <input type="hidden" name="returnTo" value={returnTo} />
                            <ConfirmButton message={`¿Cancelar la cita de ${a.customer.name}? Se le avisará por email.`}>Cancelar</ConfirmButton>
                          </form>
                        </>
                      )}
                      <Link href={`/admin/reservas/${a.id}`} className="btn btn-ghost btn-sm">
                        Abrir
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {list.length === 200 && <p className="mt-3 text-sm text-ash">Se muestran las primeras 200. Usa los filtros para acotar.</p>}
    </>
  );
}
