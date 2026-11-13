import { describe, expect, it } from "vitest";
import { computeSlots, type SlotInput } from "@/lib/slots";
import { localToUtc } from "@/lib/time";

const base: SlotInput = {
  date: "2030-03-12", // martes
  hours: { closed: false, openMin: 600, closeMin: 1200, breakStartMin: 840, breakEndMin: 960 },
  dayClosed: false,
  busy: [],
  durationMin: 30,
  stepMin: 15,
  now: new Date("2030-03-01T08:00:00Z"),
  minNoticeMin: 120,
  lastDate: "2030-04-01",
};
const times = (i: Partial<SlotInput>) => computeSlots({ ...base, ...i }).map((s) => s.time);

describe("computeSlots", () => {
  it("ofrece horas dentro del horario y fuera del descanso", () => {
    const t = times({});
    expect(t[0]).toBe("10:00");
    expect(t).toContain("13:30"); // termina justo al empezar el descanso
    expect(t).not.toContain("13:45"); // pisaría el descanso
    expect(t).not.toContain("14:00");
    expect(t).toContain("16:00");
    expect(t.at(-1)).toBe("19:30"); // el servicio debe terminar antes del cierre
  });

  it("no ofrece nada en un día cerrado o festivo", () => {
    expect(times({ dayClosed: true })).toEqual([]);
    expect(times({ hours: { ...base.hours!, closed: true } })).toEqual([]);
    expect(times({ hours: null })).toEqual([]);
  });

  it("bloquea cualquier hora que solape una cita existente", () => {
    const busy = [{ startsAt: localToUtc(base.date, 660), endsAt: localToUtc(base.date, 700) }]; // 11:00–11:40
    const t = times({ busy });
    expect(t).toContain("10:30"); // termina a las 11:00: no solapa
    expect(t).not.toContain("10:45");
    expect(t).not.toContain("11:00");
    expect(t).not.toContain("11:30");
    expect(t).toContain("11:45");
  });

  it("respeta la antelación mínima y el límite de agenda", () => {
    const now = localToUtc(base.date, 630); // 10:30 del mismo día
    expect(times({ now })[0]).toBe("12:30");
    expect(times({ lastDate: "2030-03-11" })).toEqual([]);
  });

  it("un servicio largo no cabe en huecos pequeños", () => {
    const t = times({ durationMin: 240 });
    expect(t).toEqual(["10:00", "16:00"]);
  });

  it("convierte bien la hora local en los cambios de hora", () => {
    const now = new Date("2030-01-01T00:00:00Z");
    const winter = computeSlots({ ...base, now, lastDate: "2030-12-31", date: "2030-01-15" })[0].startsAt;
    const summer = computeSlots({ ...base, now, lastDate: "2030-12-31", date: "2030-07-16" })[0].startsAt;
    expect(winter).toBe("2030-01-15T09:00:00.000Z");
    expect(summer).toBe("2030-07-16T08:00:00.000Z");
  });
});
