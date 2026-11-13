import { localToUtc, minutesToTime } from "./time";

export type DayHours = {
  closed: boolean;
  openMin: number;
  closeMin: number;
  breakStartMin: number | null;
  breakEndMin: number | null;
};

export type Busy = { startsAt: Date; endsAt: Date };

export type Slot = { time: string; startsAt: string };

export type SlotInput = {
  date: string;
  hours: DayHours | null;
  dayClosed: boolean;
  busy: Busy[];
  durationMin: number;
  stepMin: number;
  now: Date;
  minNoticeMin: number;
  /** Last bookable local date (YYYY-MM-DD), inclusive. */
  lastDate: string;
};

/**
 * Pure availability calculation for one local day. A slot is offered only if the whole
 * service fits inside opening hours, outside the break, after the notice period, and
 * touches no existing appointment or blocked range.
 */
export function computeSlots(i: SlotInput): Slot[] {
  if (i.dayClosed || !i.hours || i.hours.closed) return [];
  if (i.date > i.lastDate) return [];
  const { openMin, closeMin, breakStartMin, breakEndMin } = i.hours;
  const earliest = i.now.getTime() + i.minNoticeMin * 60_000;
  const out: Slot[] = [];

  for (let start = openMin; start + i.durationMin <= closeMin; start += i.stepMin) {
    const end = start + i.durationMin;
    if (breakStartMin != null && breakEndMin != null && start < breakEndMin && end > breakStartMin) continue;
    const s = localToUtc(i.date, start);
    const e = new Date(s.getTime() + i.durationMin * 60_000);
    if (s.getTime() < earliest) continue;
    if (i.busy.some((b) => s < b.endsAt && e > b.startsAt)) continue;
    out.push({ time: minutesToTime(start), startsAt: s.toISOString() });
  }
  return out;
}
