import { requireAdmin } from "@/auth";
import { db } from "@/lib/db";
import { formatPrice, formatShortDate } from "@/lib/time";
import { Empty, Flash, PageTitle } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { anonymizeCustomerAction } from "../../actions";

export const metadata = { title: "Clientes" };

export default async function Page({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; q?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 80);
  const customers = await db.customer.findMany({
    where: { anonymizedAt: null, ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] } : {}) },
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: { appointments: { select: { status: true, priceCents: true, startsAt: true }, orderBy: { startsAt: "desc" } } },
  });

  return (
    <>
      <PageTitle title="Clientes" intro="Datos personales: úsalos solo para gestionar las citas. Si un cliente te pide sus datos o que los borres, hazlo desde aquí." />
      <Flash sp={sp} />
      <form method="get" className="mb-6 flex max-w-lg gap-3">
        <input name="q" defaultValue={q} placeholder="Nombre, email o teléfono" aria-label="Buscar cliente" className="field" />
        <button className="btn btn-ghost">Buscar</button>
      </form>
      {customers.length === 0 ? (
        <Empty>{q ? "Ningún cliente coincide con la búsqueda." : "Aún no hay clientes. Aparecerán aquí con la primera reserva."}</Empty>
      ) : (
        <div className="card overflow-x-auto">
          <table className="tbl min-w-[52rem]">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Contacto</th>
                <th>Citas</th>
                <th>Gastado</th>
                <th>Última cita</th>
                <th>
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => {
                const done = c.appointments.filter((a) => a.status === "COMPLETED");
                return (
                  <tr key={c.id}>
                    <td className="font-medium">{c.name}</td>
                    <td>
                      <div className="num">{c.phone}</div>
                      <div className="text-xs text-ash">{c.email}</div>
                    </td>
                    <td className="num">{c.appointments.length}</td>
                    <td className="num">{formatPrice(done.reduce((n, a) => n + a.priceCents, 0))}</td>
                    <td className="num">{c.appointments[0] ? formatShortDate(c.appointments[0].startsAt) : "—"}</td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <a href={`/admin/reservas?vista=todas&q=${encodeURIComponent(c.email)}`} className="btn btn-ghost btn-sm">
                          Ver citas
                        </a>
                        <a href={`/api/admin/customers/${c.id}/export`} className="btn btn-ghost btn-sm">
                          Exportar datos
                        </a>
                        <form action={anonymizeCustomerAction}>
                          <input type="hidden" name="id" value={c.id} />
                          <ConfirmButton message={`¿Borrar los datos personales de ${c.name}? No se puede deshacer. Sus citas pasadas se conservan sin nombre para las estadísticas.`}>Borrar datos</ConfirmButton>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
