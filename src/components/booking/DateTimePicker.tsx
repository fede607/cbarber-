"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Slot = { time: string; startsAt: string };
export type Picked = { date: string; time: string } | null;

const pad = (n: number) => String(n).padStart(2, "0");
const monthLabel = (y: number, m: number) => {
  const s = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m, 1)));
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const dayLabel = (date: string) =>
  new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));

/**
 * Month calendar + free hours of the chosen day. All availability comes from the server;
 * days without free slots (closed, holiday, full) cannot be selected.
 */
export function DateTimePicker({
  serviceId,
  token,
  today,
  lastDate,
  value,
  onChange,
}: {
  serviceId: string;
  token?: string;
  today: string;
  lastDate: string;
  value: Picked;
  onChange: (v: Picked) => void;
}) {
  const [ty, tm] = today.split("-").map(Number);
  const [ly, lm] = lastDate.split("-").map(Number);
  const [view, setView] = useState({ y: ty, m: tm - 1 });
  const [daysRes, setDaysRes] = useState<{ key: string; days: Record<string, number> } | null>(null);
  const [date, setDate] = useState<string | null>(value?.date ?? null);
  const [slotsRes, setSlotsRes] = useState<{ key: string; slots: Slot[] } | null>(null);
  const [errorRes, setErrorRes] = useState<{ key: string; message: string } | null>(null);

  const qs = useMemo(() => `serviceId=${serviceId}${token ? `&token=${token}` : ""}`, [serviceId, token]);
  const daysInMonth = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
  const from = `${view.y}-${pad(view.m + 1)}-01`;
  const to = `${view.y}-${pad(view.m + 1)}-${pad(daysInMonth)}`;

  // Results are stored with the request they answer, so a stale answer is never shown for a new month or day.
  const daysKey = `${qs}&from=${from}&to=${to}`;
  const slotsKey = date ? `${qs}&date=${date}` : "";
  const days = daysRes?.key === daysKey ? daysRes.days : null;
  const slots = slotsRes?.key === slotsKey ? slotsRes.slots : null;
  const error = errorRes && (errorRes.key === daysKey || errorRes.key === slotsKey) ? errorRes.message : "";

  useEffect(() => {
    let alive = true;
    fetch(`/api/availability?${daysKey}`)
      .then(async (r) => {
        const j = await r.json();
        if (!alive) return;
        if (!r.ok) throw new Error(j.error);
        setDaysRes({ key: daysKey, days: j.days });
      })
      .catch((e) => alive && setErrorRes({ key: daysKey, message: e.message || "No hemos podido cargar el calendario." }));
    return () => {
      alive = false;
    };
  }, [daysKey]);

  useEffect(() => {
    if (!slotsKey) return;
    let alive = true;
    fetch(`/api/availability?${slotsKey}`)
      .then(async (r) => {
        const j = await r.json();
        if (!alive) return;
        if (!r.ok) throw new Error(j.error);
        setSlotsRes({ key: slotsKey, slots: j.slots });
      })
      .catch((e) => alive && setErrorRes({ key: slotsKey, message: e.message || "No hemos podido cargar las horas." }));
    return () => {
      alive = false;
    };
  }, [slotsKey]);

  const offset = (new Date(Date.UTC(view.y, view.m, 1)).getUTCDay() + 6) % 7;
  const canPrev = view.y > ty || (view.y === ty && view.m > tm - 1);
  const canNext = view.y < ly || (view.y === ly && view.m < lm - 1);
  const move = (d: number) => setView((v) => ({ y: v.y + Math.floor((v.m + d) / 12), m: (v.m + d + 12) % 12 }));

  return (
    <div className="grid gap-8 md:grid-cols-[1.1fr_0.9fr]">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <button type="button" className="grid h-11 w-11 place-items-center border border-line disabled:opacity-30" onClick={() => move(-1)} disabled={!canPrev} aria-label="Mes anterior">
            <ChevronLeft size={18} />
          </button>
          <p className="font-display text-2xl" aria-live="polite">
            {monthLabel(view.y, view.m)}
          </p>
          <button type="button" className="grid h-11 w-11 place-items-center border border-line disabled:opacity-30" onClick={() => move(1)} disabled={!canNext} aria-label="Mes siguiente">
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center" role="grid" aria-label="Calendario">
          {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
            <div key={d} className="eyebrow !text-ash py-2" aria-hidden>
              {d}
            </div>
          ))}
          {Array.from({ length: offset }).map((_, i) => (
            <div key={`e${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const d = `${view.y}-${pad(view.m + 1)}-${pad(i + 1)}`;
            const free = days?.[d] ?? 0;
            const selected = d === date;
            const disabled = !days || free === 0;
            return (
              <button
                key={d}
                type="button"
                disabled={disabled}
                aria-pressed={selected}
                aria-label={`${dayLabel(d)}${disabled ? ", sin horas libres" : `, ${free} horas libres`}`}
                onClick={() => {
                  setDate(d);
                  onChange(null);
                }}
                className={`num aspect-square min-h-11 border text-sm transition-colors ${
                  selected
                    ? "border-brass bg-brass text-ink"
                    : disabled
                      ? "border-transparent text-ash/35 line-through decoration-ash/20"
                      : "border-line hover:border-brass hover:text-brass"
                } ${d === today && !selected ? "font-semibold underline decoration-brass underline-offset-4" : ""}`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
        {!days && !error && <p className="mt-3 text-sm text-ash">Cargando disponibilidad…</p>}
        {error && (
          <p className="mt-3 text-sm text-danger" role="alert">
            {error}
          </p>
        )}
      </div>

      <div aria-live="polite">
        <p className="eyebrow mb-4 !text-ash">{date ? dayLabel(date) : "Horas libres"}</p>
        {!date && <p className="text-ash">Elige un día en el calendario para ver las horas libres.</p>}
        {date && !slots && !error && <p className="text-ash">Cargando horas…</p>}
        {date && slots && slots.length === 0 && <p className="text-ash">Ese día ya no quedan horas. Prueba con otro.</p>}
        {date && slots && slots.length > 0 && (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-3">
            {slots.map((sl) => {
              const selected = value?.date === date && value.time === sl.time;
              return (
                <button
                  key={sl.time}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onChange({ date, time: sl.time })}
                  className={`num min-h-11 border py-2 transition-colors ${selected ? "border-brass bg-brass text-ink" : "border-line hover:border-brass hover:text-brass"}`}
                >
                  {sl.time}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
