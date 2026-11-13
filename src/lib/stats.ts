import "server-only";
import { db } from "./db";
import { addDays, localToUtc, todayStr, weekdayOf } from "./time";

/** All figures come straight from the Appointment table. Revenue counts completed appointments only. */
export async function getDashboard() {
  const today = todayStr();
  const weekStart = addDays(today, -((weekdayOf(today) + 6) % 7));
  const monthStart = `${today.slice(0, 8)}01`;
  const nextMonth = (() => {
    const [y, m] = today.split("-").map(Number);
    return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  })();
  const now = new Date();

  const revenue = async (from: string, to: string) =>
    (await db.appointment.aggregate({ _sum: { priceCents: true }, where: { status: "COMPLETED", startsAt: { gte: localToUtc(from, 0), lt: localToUtc(to, 0) } } }))._sum.priceCents ?? 0;
  const monthRange = { gte: localToUtc(monthStart, 0), lt: localToUtc(nextMonth, 0) };

  const [day, week, month, expected, total, pending, completed, cancelled, noShow, topServices, series, todayList] = await Promise.all([
    revenue(today, addDays(today, 1)),
    revenue(weekStart, addDays(weekStart, 7)),
    revenue(monthStart, nextMonth),
    db.appointment.aggregate({ _sum: { priceCents: true }, where: { status: "PENDING", startsAt: monthRange } }),
    db.appointment.count({ where: { startsAt: monthRange } }),
    db.appointment.count({ where: { status: "PENDING", startsAt: { gte: now } } }),
    db.appointment.count({ where: { status: "COMPLETED", startsAt: monthRange } }),
    db.appointment.count({ where: { status: "CANCELLED", startsAt: monthRange } }),
    db.appointment.count({ where: { status: "NO_SHOW", startsAt: monthRange } }),
    db.$queryRaw<{ name: string; count: bigint; revenue: bigint }[]>`
      SELECT "serviceName" AS name, COUNT(*) AS count,
             COALESCE(SUM("priceCents") FILTER (WHERE status = 'COMPLETED'), 0) AS revenue
      FROM "Appointment"
      WHERE status IN ('PENDING', 'COMPLETED') AND "startsAt" >= now() - interval '90 days' AND "startsAt" < now() + interval '60 days'
      GROUP BY 1 ORDER BY count DESC, revenue DESC LIMIT 6`,
    db.$queryRaw<{ day: string; revenue: bigint; bookings: bigint }[]>`
      SELECT to_char(d.day, 'YYYY-MM-DD') AS day,
             COALESCE(SUM(a."priceCents") FILTER (WHERE a.status = 'COMPLETED'), 0) AS revenue,
             COUNT(a.id) FILTER (WHERE a.status IN ('PENDING', 'COMPLETED')) AS bookings
      FROM generate_series((now() AT TIME ZONE 'Europe/Madrid')::date - 29, (now() AT TIME ZONE 'Europe/Madrid')::date, interval '1 day') AS d(day)
      LEFT JOIN "Appointment" a ON (a."startsAt" AT TIME ZONE 'Europe/Madrid')::date = d.day::date
      GROUP BY d.day ORDER BY d.day`,
    db.appointment.findMany({
      where: { status: { in: ["PENDING", "COMPLETED"] }, startsAt: { gte: localToUtc(today, 0), lt: localToUtc(addDays(today, 1), 0) } },
      orderBy: { startsAt: "asc" },
      include: { customer: { select: { name: true, phone: true } } },
    }),
  ]);

  return {
    revenue: { day, week, month, expected: expected._sum.priceCents ?? 0 },
    counts: { total, pending, completed, cancelled, noShow },
    topServices: topServices.map((t) => ({ name: t.name, count: Number(t.count), revenue: Number(t.revenue) / 100 })),
    series: series.map((s) => ({ day: s.day, label: `${s.day.slice(8)}/${s.day.slice(5, 7)}`, revenue: Number(s.revenue) / 100, bookings: Number(s.bookings) })),
    todayList,
  };
}
