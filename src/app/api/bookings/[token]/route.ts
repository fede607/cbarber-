import { cancelBooking, findByToken, rescheduleBooking } from "@/lib/booking";
import { sendAppointmentEmail } from "@/lib/email";
import { errorResponse, readJson, sameOrigin } from "@/lib/http";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";
import { isTokenShape } from "@/lib/tokens";
import { firstError, rescheduleSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ token: string }> };

async function guard(ctx: Ctx) {
  if (!(await sameOrigin())) return { res: Response.json({ error: "Origen no permitido" }, { status: 403 }) };
  if (!(await rateLimit(`manage:${await clientIp()}`, 20, 3600))) return { res: tooMany() };
  const { token } = await ctx.params;
  const appt = isTokenShape(token) ? await findByToken(token) : null;
  if (!appt) return { res: Response.json({ error: "No encontramos esa cita." }, { status: 404 }) };
  return { appt, token };
}

/** Reschedule. */
export async function PATCH(req: Request, ctx: Ctx) {
  const g = await guard(ctx);
  if (g.res) return g.res;
  const parsed = rescheduleSchema.safeParse(await readJson(req));
  if (!parsed.success) return Response.json({ error: firstError(parsed.error) }, { status: 400 });
  try {
    const { previous, updated } = await rescheduleBooking(g.appt.id, parsed.data.date, parsed.data.time, "customer");
    await sendAppointmentEmail("reschedule", updated, g.token, previous.startsAt);
    return Response.json({ ok: true, startsAt: updated.startsAt });
  } catch (e) {
    return errorResponse(e);
  }
}

/** Cancel. */
export async function DELETE(_req: Request, ctx: Ctx) {
  const g = await guard(ctx);
  if (g.res) return g.res;
  try {
    const cancelled = await cancelBooking(g.appt.id, "customer");
    await sendAppointmentEmail("cancellation", cancelled);
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
