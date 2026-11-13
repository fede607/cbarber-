import { db } from "@/lib/db";
import { sendAppointmentEmail } from "@/lib/email";
import { manageTokenFor, safeEqual } from "@/lib/tokens";

/**
 * Called by Vercel Cron (see vercel.json) with `Authorization: Bearer $CRON_SECRET`.
 *  - sends one reminder per pending appointment starting within REMINDER_WINDOW_HOURS,
 *  - anonymises customers with no appointment in RETENTION_MONTHS (RGPD: limitación del plazo de conservación),
 *  - clears expired rate-limit rows and old logs.
 * Idempotent: `reminderSentAt` is claimed atomically before sending, so a retry never sends twice.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(given, `Bearer ${secret}`)) return new Response("Unauthorized", { status: 401 });

  const windowH = Number(process.env.REMINDER_WINDOW_HOURS ?? 36);
  const now = new Date();
  const until = new Date(now.getTime() + windowH * 3_600_000);

  const due = await db.appointment.findMany({
    where: { status: "PENDING", reminderSentAt: null, startsAt: { gt: now, lte: until } },
    include: { customer: true },
  });

  let sent = 0;
  for (const a of due) {
    const claimed = await db.appointment.updateMany({ where: { id: a.id, reminderSentAt: null, status: "PENDING" }, data: { reminderSentAt: new Date() } });
    if (claimed.count === 0) continue;
    const r = await sendAppointmentEmail("reminder", a, manageTokenFor(a.id));
    if (r.ok) sent++;
    else if (r.reason !== "not_configured") await db.appointment.update({ where: { id: a.id }, data: { reminderSentAt: null } });
  }

  const months = Number(process.env.RETENTION_MONTHS ?? 24);
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - months);
  const stale = await db.customer.findMany({
    where: { anonymizedAt: null, createdAt: { lt: cutoff }, appointments: { none: { startsAt: { gt: cutoff } } } },
    select: { id: true },
  });
  for (const c of stale) {
    await db.customer.update({ where: { id: c.id }, data: { name: "Cliente eliminado", email: `eliminado-${c.id}@anon.invalid`, phone: "", anonymizedAt: now } });
  }

  const logCutoff = new Date(now.getTime() - 180 * 86_400_000);
  await db.rateLimit.deleteMany({ where: { expiresAt: { lt: now } } });
  await db.emailLog.deleteMany({ where: { createdAt: { lt: logCutoff } } });
  await db.auditLog.deleteMany({ where: { createdAt: { lt: logCutoff } } });

  return Response.json({ ok: true, due: due.length, sent, anonymized: stale.length });
}
