import Link from "next/link";
import { requireAdmin } from "@/auth";
import { db } from "@/lib/db";
import { formatDuration, todayStr } from "@/lib/time";
import { F, Flash, PageTitle } from "@/components/admin/ui";
import { createAppointmentAction } from "../../../actions";

export const metadata = { title: "Nueva reserva" };

export default async function Page({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const services = await db.service.findMany({ where: { deletedAt: null }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  return (
    <>
      <PageTitle title="Nueva reserva" intro="Para citas por teléfono o en persona. Puedes saltarte el horario de apertura, pero nunca pisar otra cita." />
      <Flash sp={sp} />
      <form action={createAppointmentAction} className="card grid max-w-3xl gap-5 p-5 md:grid-cols-2 md:p-6">
        <F label="Servicio" className="md:col-span-2">
          <select name="serviceId" required className="field">
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {formatDuration(s.durationMin)}
              </option>
            ))}
          </select>
        </F>
        <F label="Día">
          <input type="date" name="date" required defaultValue={todayStr()} className="field" />
        </F>
        <F label="Hora">
          <input type="time" name="time" required step={300} className="field" />
        </F>
        <F label="Nombre del cliente" className="md:col-span-2">
          <input name="name" required maxLength={80} className="field" />
        </F>
        <F label="Teléfono">
          <input name="phone" type="tel" required className="field" />
        </F>
        <F label="Email">
          <input name="email" type="email" required className="field" />
        </F>
        <F label="Notas internas" hint="Solo las ves tú." className="md:col-span-2">
          <textarea name="notes" maxLength={500} className="field" />
        </F>
        <label className="flex items-center gap-3 text-sm md:col-span-2">
          <input type="checkbox" name="notify" defaultChecked className="h-5 w-5 accent-[#c6a15b]" />
          Enviar email de confirmación al cliente
        </label>
        <div className="flex gap-3 md:col-span-2">
          <button className="btn btn-primary">Crear reserva</button>
          <Link href="/admin/reservas" className="btn btn-ghost">
            Volver
          </Link>
        </div>
      </form>
    </>
  );
}
