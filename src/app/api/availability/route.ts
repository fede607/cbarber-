import { db } from "@/lib/db";
import { getDaySlots, getRangeAvailability } from "@/lib/availability";
import { getSettings } from "@/lib/settings";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";
import { hashToken, isTokenShape } from "@/lib/tokens";
import { addDays, isDateStr } from "@/lib/time";
import { idStr } from "@/lib/validation";

/**
 * GET /api/availability?serviceId=…&date=YYYY-MM-DD        → free slots of one day
 * GET /api/availability?serviceId=…&from=…&to=…            → free-slot count per day
 * Optional `token` = manage token of the appointment being rescheduled (its own slot counts as free).
 * Only returns times: never names or any customer data.
 */
export async function GET(req: Request) {
  if (!(await rateLimit(`avail:${await clientIp()}`, 120, 60))) return tooMany();

  const q = new URL(req.url).searchParams;
  const serviceId = idStr.safeParse(q.get("serviceId"));
  if (!serviceId.success) return Response.json({ error: "Servicio no válido" }, { status: 400 });

  const settings = await getSettings();
  let durationMin: number;
  let excludeAppointmentId: string | undefined;

  const token = q.get("token");
  if (token && isTokenShape(token)) {
    const appt = await db.appointment.findUnique({ where: { manageTokenHash: hashToken(token) }, select: { id: true, durationMin: true } });
    if (!appt) return Response.json({ error: "Cita no encontrada" }, { status: 404 });
    excludeAppointmentId = appt.id;
    durationMin = appt.durationMin;
  } else {
    const service = await db.service.findFirst({ where: { id: serviceId.data, active: true, deletedAt: null }, select: { durationMin: true } });
    if (!service) return Response.json({ error: "Servicio no encontrado" }, { status: 404 });
    durationMin = service.durationMin;
  }

  const date = q.get("date");
  if (date) {
    if (!isDateStr(date)) return Response.json({ error: "Fecha no válida" }, { status: 400 });
    const slots = await getDaySlots(db, date, durationMin, settings, { excludeAppointmentId });
    return Response.json({ date, slots });
  }

  const from = q.get("from") ?? "";
  const to = q.get("to") ?? "";
  if (!isDateStr(from) || !isDateStr(to) || to < from || to > addDays(from, 45))
    return Response.json({ error: "Rango no válido" }, { status: 400 });
  const days = await getRangeAvailability(db, from, to, durationMin, settings, { excludeAppointmentId });
  return Response.json({ days });
}
