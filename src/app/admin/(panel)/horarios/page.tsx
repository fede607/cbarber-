import { requireAdmin } from "@/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { WEEKDAYS, WEEK_ORDER, formatLongDateYear, minutesToTime, timeStrOf, todayStr } from "@/lib/time";
import { F, Flash, PageTitle, Section } from "@/components/admin/ui";
import { addBlockAction, addClosedDayAction, removeBlockAction, removeClosedDayAction, saveHoursAction, saveRulesAction } from "../../actions";

export const metadata = { title: "Horarios" };

export default async function Page({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const today = todayStr();
  const [hours, closed, blocks, s] = await Promise.all([
    db.weeklyHours.findMany(),
    db.closedDay.findMany({ where: { date: { gte: today } }, orderBy: { date: "asc" } }),
    db.timeBlock.findMany({ where: { endsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" } }),
    getSettings(),
  ]);

  return (
    <>
      <PageTitle title="Horarios" intro="Todo lo que cambies aquí se aplica al momento en el calendario público." />
      <Flash sp={sp} />

      <Section title="Horario semanal" intro="Deja el descanso vacío si ese día no paras.">
        <form action={saveHoursAction}>
          <div className="overflow-x-auto">
            <table className="tbl min-w-[40rem]">
              <thead>
                <tr>
                  <th>Día</th>
                  <th>Cerrado</th>
                  <th>Abre</th>
                  <th>Cierra</th>
                  <th>Descanso desde</th>
                  <th>Descanso hasta</th>
                </tr>
              </thead>
              <tbody>
                {WEEK_ORDER.map((wd) => {
                  const h = hours.find((x) => x.weekday === wd);
                  const t = (m?: number | null) => (m == null ? "" : minutesToTime(m));
                  return (
                    <tr key={wd}>
                      <th scope="row" className="!font-sans !text-sm !normal-case !tracking-normal !text-bone">
                        {WEEKDAYS[wd]}
                      </th>
                      <td>
                        <input type="checkbox" name={`closed-${wd}`} defaultChecked={h?.closed ?? true} aria-label={`${WEEKDAYS[wd]} cerrado`} className="h-5 w-5 accent-[#c6a15b]" />
                      </td>
                      <td>
                        <input type="time" name={`open-${wd}`} defaultValue={t(h?.openMin ?? 600)} aria-label={`${WEEKDAYS[wd]} abre`} className="field" />
                      </td>
                      <td>
                        <input type="time" name={`close-${wd}`} defaultValue={t(h?.closeMin ?? 1200)} aria-label={`${WEEKDAYS[wd]} cierra`} className="field" />
                      </td>
                      <td>
                        <input type="time" name={`bstart-${wd}`} defaultValue={t(h?.breakStartMin)} aria-label={`${WEEKDAYS[wd]} inicio del descanso`} className="field" />
                      </td>
                      <td>
                        <input type="time" name={`bend-${wd}`} defaultValue={t(h?.breakEndMin)} aria-label={`${WEEKDAYS[wd]} fin del descanso`} className="field" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button className="btn btn-primary mt-5">Guardar horario</button>
        </form>
      </Section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Festivos y días cerrados" intro="Un día cerrado no admite ninguna reserva. Para vacaciones, indica también el último día.">
          <form action={addClosedDayAction} className="grid gap-4 sm:grid-cols-2">
            <F label="Día">
              <input type="date" name="from" required min={today} className="field" />
            </F>
            <F label="Hasta (opcional)">
              <input type="date" name="to" min={today} className="field" />
            </F>
            <F label="Motivo (se ve en la web)" className="sm:col-span-2">
              <input name="reason" maxLength={80} placeholder="Festivo, vacaciones…" className="field" />
            </F>
            <button className="btn btn-primary btn-sm sm:col-span-2 sm:justify-self-start">Cerrar estos días</button>
          </form>
          <ul className="mt-6">
            {closed.length === 0 && <li className="text-sm text-ash">No hay días cerrados próximamente.</li>}
            {closed.map((c) => (
              <li key={c.date} className="flex items-center justify-between gap-3 border-t border-line py-3 text-sm">
                <span className="capitalize">
                  {formatLongDateYear(new Date(`${c.date}T12:00:00Z`))}
                  {c.reason && <span className="text-ash normal-case"> · {c.reason}</span>}
                </span>
                <form action={removeClosedDayAction}>
                  <input type="hidden" name="date" value={c.date} />
                  <button className="btn btn-ghost btn-sm">Reabrir</button>
                </form>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Bloquear horas" intro="Para un médico, un recado o un descanso puntual. Esas horas no se ofrecen en la web.">
          <form action={addBlockAction} className="grid gap-4 sm:grid-cols-3">
            <F label="Día">
              <input type="date" name="date" required min={today} className="field" />
            </F>
            <F label="Desde">
              <input type="time" name="start" required className="field" />
            </F>
            <F label="Hasta">
              <input type="time" name="end" required className="field" />
            </F>
            <F label="Motivo (solo lo ves tú)" className="sm:col-span-3">
              <input name="reason" maxLength={80} className="field" />
            </F>
            <button className="btn btn-primary btn-sm sm:col-span-3 sm:justify-self-start">Bloquear horas</button>
          </form>
          <ul className="mt-6">
            {blocks.length === 0 && <li className="text-sm text-ash">No hay horas bloqueadas.</li>}
            {blocks.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 border-t border-line py-3 text-sm">
                <span>
                  <span className="capitalize">{formatLongDateYear(b.startsAt)}</span>, <span className="num">{timeStrOf(b.startsAt)}–{timeStrOf(b.endsAt)}</span>
                  {b.reason && <span className="text-ash"> · {b.reason}</span>}
                </span>
                <form action={removeBlockAction}>
                  <input type="hidden" name="id" value={b.id} />
                  <button className="btn btn-ghost btn-sm">Quitar</button>
                </form>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <Section title="Reglas de reserva">
        <form action={saveRulesAction} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <F label="Una hora cada (min)" hint="Separación entre horas ofrecidas.">
            <input type="number" name="slotStepMin" min={5} max={120} step={5} defaultValue={s.slotStepMin} className="field num" />
          </F>
          <F label="Antelación mínima (min)" hint="Nadie reserva con menos margen.">
            <input type="number" name="minNoticeMin" min={0} max={10080} defaultValue={s.minNoticeMin} className="field num" />
          </F>
          <F label="Días de agenda abiertos" hint="Hasta cuándo se puede reservar.">
            <input type="number" name="maxAdvanceDays" min={1} max={365} defaultValue={s.maxAdvanceDays} className="field num" />
          </F>
          <F label="Límite para cancelar (min)" hint="Después, el cliente debe llamarte.">
            <input type="number" name="cancelLimitMin" min={0} max={10080} defaultValue={s.cancelLimitMin} className="field num" />
          </F>
          <button className="btn btn-primary btn-sm sm:col-span-2 sm:justify-self-start xl:col-span-4">Guardar reglas</button>
        </form>
      </Section>
    </>
  );
}
