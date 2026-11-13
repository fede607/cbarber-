import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { computeSlots, type Slot } from "./slots";
import { addDays, localToUtc, todayStr, weekdayOf } from "./time";

type Client = Prisma.TransactionClient | typeof db;

export const ACTIVE_STATUSES = ["PENDING", "COMPLETED"] as const;

type Rules = { slotStepMin: number; minNoticeMin: number; maxAdvanceDays: number };

async function loadRange(client: Client, from: string, to: string, excludeAppointmentId?: string) {
  const start = localToUtc(from, 0);
  const end = localToUtc(addDays(to, 1), 0);
  const [hours, closed, appts, blocks] = await Promise.all([
    client.weeklyHours.findMany(),
    client.closedDay.findMany({ where: { date: { gte: from, lte: to } } }),
    client.appointment.findMany({
      where: {
        status: { in: [...ACTIVE_STATUSES] },
        startsAt: { lt: end },
        endsAt: { gt: start },
        ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
      },
      select: { startsAt: true, endsAt: true },
    }),
    client.timeBlock.findMany({ where: { startsAt: { lt: end }, endsAt: { gt: start } }, select: { startsAt: true, endsAt: true } }),
  ]);
  return { hours, closed: new Set(closed.map((c) => c.date)), busy: [...appts, ...blocks] };
}

export async function getDaySlots(
  client: Client,
  date: string,
  durationMin: number,
  rules: Rules,
  opts: { excludeAppointmentId?: string; now?: Date } = {},
): Promise<Slot[]> {
  const now = opts.now ?? new Date();
  const data = await loadRange(client, date, date, opts.excludeAppointmentId);
  return computeSlots({
    date,
    hours: data.hours.find((h) => h.weekday === weekdayOf(date)) ?? null,
    dayClosed: data.closed.has(date),
    busy: data.busy,
    durationMin,
    stepMin: rules.slotStepMin,
    now,
    minNoticeMin: rules.minNoticeMin,
    lastDate: addDays(todayStr(now), rules.maxAdvanceDays),
  });
}

/** For each day of the range, how many slots are free. Drives the public calendar. */
export async function getRangeAvailability(
  client: Client,
  from: string,
  to: string,
  durationMin: number,
  rules: Rules,
  opts: { excludeAppointmentId?: string; now?: Date } = {},
): Promise<Record<string, number>> {
  const now = opts.now ?? new Date();
  const data = await loadRange(client, from, to, opts.excludeAppointmentId);
  const lastDate = addDays(todayStr(now), rules.maxAdvanceDays);
  const out: Record<string, number> = {};
  for (let d = from; d <= to; d = addDays(d, 1)) {
    out[d] = computeSlots({
      date: d,
      hours: data.hours.find((h) => h.weekday === weekdayOf(d)) ?? null,
      dayClosed: data.closed.has(d),
      busy: data.busy,
      durationMin,
      stepMin: rules.slotStepMin,
      now,
      minNoticeMin: rules.minNoticeMin,
      lastDate,
    }).length;
  }
  return out;
}

/** First free slot from today onwards, for the shortest active service. */
export async function getNextSlot(client: Client, durationMin: number, rules: Rules): Promise<Slot | null> {
  const from = todayStr();
  const to = addDays(from, Math.min(rules.maxAdvanceDays, 21));
  const data = await loadRange(client, from, to);
  const now = new Date();
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const slots = computeSlots({
      date: d,
      hours: data.hours.find((h) => h.weekday === weekdayOf(d)) ?? null,
      dayClosed: data.closed.has(d),
      busy: data.busy,
      durationMin,
      stepMin: rules.slotStepMin,
      now,
      minNoticeMin: rules.minNoticeMin,
      lastDate: to,
    });
    if (slots.length) return slots[0];
  }
  return null;
}
