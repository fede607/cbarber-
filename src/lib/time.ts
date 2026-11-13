import { fromZonedTime, formatInTimeZone } from "date-fns-tz";

export const TZ = "Europe/Madrid";

const pad = (n: number) => String(n).padStart(2, "0");

export const isDateStr = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
export const isTimeStr = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

export const minutesToTime = (min: number) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
export const timeToMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

/** Local wall-clock (Madrid) date + minutes from midnight → UTC instant. */
export function localToUtc(date: string, minutes: number): Date {
  return fromZonedTime(`${date}T${minutesToTime(minutes)}:00`, TZ);
}

export const dateStrOf = (d: Date) => formatInTimeZone(d, TZ, "yyyy-MM-dd");
export const timeStrOf = (d: Date) => formatInTimeZone(d, TZ, "HH:mm");
export const todayStr = (now = new Date()) => dateStrOf(now);

/** Weekday (0 = Sunday) of a YYYY-MM-DD string, independent of time zone. */
export const weekdayOf = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const longDate = new Intl.DateTimeFormat("es-ES", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });
const longDateYear = new Intl.DateTimeFormat("es-ES", { timeZone: TZ, weekday: "long", day: "numeric", month: "long", year: "numeric" });
const shortDate = new Intl.DateTimeFormat("es-ES", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric" });

export const formatLongDate = (d: Date) => longDate.format(d);
export const formatLongDateYear = (d: Date) => longDateYear.format(d);
export const formatShortDate = (d: Date) => shortDate.format(d);
export const formatDateTime = (d: Date) => `${formatLongDate(d)}, ${timeStrOf(d)} h`;

export const formatPrice = (cents: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: cents % 100 === 0 ? 0 : 2 }).format(cents / 100);

export const formatDuration = (min: number) =>
  min < 60 ? `${min} min` : min % 60 === 0 ? `${min / 60} h` : `${Math.floor(min / 60)} h ${min % 60} min`;

export const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
/** Monday-first display order. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const minutesUntil = (d: Date) => (d.getTime() - Date.now()) / 60_000;
