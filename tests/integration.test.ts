/**
 * Pruebas de extremo a extremo contra un servidor real (`npm run build && npm start`) y su base de datos.
 * Ejecutar con: TEST_URL=http://localhost:3000 npm test
 * Crean y borran sus propios datos (clientes con email @test.invalid).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";

const BASE = process.env.TEST_URL ?? "http://localhost:3000";
const db = new PrismaClient();
const run = Boolean(process.env.TEST_URL);
let ipSeq = 0;
const headers = (ip?: string) => ({ "Content-Type": "application/json", Origin: BASE, "x-forwarded-for": ip ?? `10.9.${Math.floor(ipSeq / 250)}.${(ipSeq++ % 250) + 1}` });

let serviceId = "";
let longServiceId = "";
let date = "";

const person = (n: number) => ({ name: `Prueba ${n}`, phone: "600123456", email: `p${n}-${Date.now()}@test.invalid`, consent: true });
const book = (body: object, ip?: string) => fetch(`${BASE}/api/bookings`, { method: "POST", headers: headers(ip), body: JSON.stringify(body) });
const slots = async (d: string, s = serviceId) => ((await (await fetch(`${BASE}/api/availability?serviceId=${s}&date=${d}`, { headers: headers() })).json()).slots ?? []) as { time: string }[];

async function cleanup() {
  await db.emailLog.deleteMany({ where: { recipient: { endsWith: "@test.invalid" } } });
  await db.appointment.deleteMany({ where: { customer: { email: { endsWith: "@test.invalid" } } } });
  await db.customer.deleteMany({ where: { email: { endsWith: "@test.invalid" } } });
  await db.closedDay.deleteMany({ where: { reason: "TEST" } });
  await db.timeBlock.deleteMany({ where: { reason: "TEST" } });
  await db.rateLimit.deleteMany({});
}

describe.skipIf(!run)("reservas (servidor real)", () => {
  beforeAll(async () => {
    await cleanup();
    const services = await db.service.findMany({ where: { active: true, deletedAt: null }, orderBy: { durationMin: "asc" } });
    serviceId = services[0].id;
    longServiceId = services.at(-1)!.id;
    // Primer día con horas libres a partir de dentro de 10 días.
    for (let i = 10; i < 30 && !date; i++) {
      const d = new Date(Date.now() + i * 86_400_000).toISOString().slice(0, 10);
      if ((await slots(d)).length > 8) date = d;
    }
    expect(date).not.toBe("");
  });

  afterAll(async () => {
    await cleanup();
    await db.$disconnect();
  });

  it("crea una reserva, la hora desaparece del calendario y queda registrado el email", async () => {
    const before = await slots(date);
    const time = before[0].time;
    const p = person(1);
    const r = await book({ serviceId, date, time, ...p });
    expect(r.status).toBe(201);
    const j = await r.json();
    expect(j.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect((await slots(date)).map((s) => s.time)).not.toContain(time);
    const log = await db.emailLog.findFirst({ where: { recipient: p.email, type: "confirmation" } });
    expect(log).not.toBeNull();
  });

  it("20 personas a la vez sobre la misma hora: solo una la consigue", async () => {
    const time = (await slots(date))[0].time;
    const results = await Promise.all(Array.from({ length: 20 }, (_, i) => book({ serviceId, date, time, ...person(100 + i) })));
    const codes = results.map((r) => r.status);
    expect(codes.filter((c) => c === 201)).toHaveLength(1);
    expect(codes.filter((c) => c === 409)).toHaveLength(19);
    const start = new Date(`${date}T00:00:00Z`);
    const inDb = await db.appointment.findMany({ where: { status: "PENDING", customer: { email: { contains: "@test.invalid" } }, startsAt: { gte: start } } });
    const starts = inDb.map((a) => a.startsAt.toISOString());
    expect(new Set(starts).size).toBe(starts.length);
  });

  it("no deja reservar un servicio largo que solape una cita existente", async () => {
    const free = await slots(date);
    const time = free[2].time; // hueco libre; lo ocupa un servicio corto
    expect((await book({ serviceId, date, time, ...person(200) })).status).toBe(201);
    const r = await book({ serviceId: longServiceId, date, time, ...person(201) });
    expect(r.status).toBe(409);
  });

  it("la base de datos rechaza un solape aunque se salte la aplicación", async () => {
    const a = await db.appointment.findFirstOrThrow({ where: { status: "PENDING", customer: { email: { endsWith: "@test.invalid" } } } });
    await expect(
      db.appointment.create({
        data: { customerId: a.customerId, serviceId: a.serviceId, serviceName: "x", priceCents: 1, durationMin: 10, startsAt: new Date(a.startsAt.getTime() + 60_000), endsAt: new Date(a.endsAt.getTime() + 60_000), manageTokenHash: `t-${Date.now()}` },
      }),
    ).rejects.toThrow(/Appointment_no_overlap|23P01/);
  });

  it("un festivo bloquea todas las reservas de ese día", async () => {
    const d = new Date(new Date(`${date}T12:00:00Z`).getTime() + 7 * 86_400_000).toISOString().slice(0, 10);
    const before = await slots(d);
    expect(before.length).toBeGreaterThan(0);
    await db.closedDay.create({ data: { date: d, reason: "TEST" } });
    expect(await slots(d)).toEqual([]);
    expect((await book({ serviceId, date: d, time: before[0].time, ...person(300) })).status).toBe(409);
    const range = await (await fetch(`${BASE}/api/availability?serviceId=${serviceId}&from=${d}&to=${d}`, { headers: headers() })).json();
    expect(range.days[d]).toBe(0);
    await db.closedDay.delete({ where: { date: d } });
    expect((await slots(d)).length).toBe(before.length);
  });

  it("un bloqueo de horas quita esas horas del calendario", async () => {
    const free = await slots(date);
    const target = free.at(-1)!.time;
    const [h, m] = target.split(":").map(Number);
    const { localToUtc } = await import("@/lib/time");
    await db.timeBlock.create({ data: { startsAt: localToUtc(date, h * 60 + m), endsAt: localToUtc(date, h * 60 + m + 30), reason: "TEST" } });
    expect((await slots(date)).map((s) => s.time)).not.toContain(target);
    expect((await book({ serviceId, date, time: target, ...person(400) })).status).toBe(409);
  });

  it("el cliente puede cambiar y cancelar su cita con su enlace, y la hora vuelve a quedar libre", async () => {
    const free = await slots(date);
    const [t1, t2] = [free[4].time, free[6].time];
    const p = person(500);
    const { token } = await (await book({ serviceId, date, time: t1, ...p })).json();

    const page = await fetch(`${BASE}/reserva/${token}`);
    expect(page.status).toBe(200);
    expect(await page.text()).toContain(p.name);

    const moved = await fetch(`${BASE}/api/bookings/${token}`, { method: "PATCH", headers: headers(), body: JSON.stringify({ date, time: t2 }) });
    expect(moved.status).toBe(200);
    let now = (await slots(date)).map((s) => s.time);
    expect(now).toContain(t1);
    expect(now).not.toContain(t2);

    const cancelled = await fetch(`${BASE}/api/bookings/${token}`, { method: "DELETE", headers: headers() });
    expect(cancelled.status).toBe(200);
    now = (await slots(date)).map((s) => s.time);
    expect(now).toContain(t2);
    const types = (await db.emailLog.findMany({ where: { recipient: p.email } })).map((e) => e.type).sort();
    expect(types).toEqual(["cancellation", "confirmation", "reschedule"]);
    expect((await fetch(`${BASE}/api/bookings/${token}`, { method: "DELETE", headers: headers() })).status).toBe(403);
  });

  it("rechaza datos inválidos, HTML en el nombre y peticiones desde otro sitio", async () => {
    const time = (await slots(date))[0].time;
    expect((await book({ serviceId, date, time, ...person(600), name: "<script>alert(1)</script>" })).status).toBe(400);
    expect((await book({ serviceId, date, time, ...person(601), email: "no-es-un-email" })).status).toBe(400);
    expect((await book({ serviceId, date, time, ...person(602), consent: false })).status).toBe(400);
    expect((await book({ serviceId: "' OR 1=1 --", date, time, ...person(603) })).status).toBe(400);
    expect((await book({ serviceId, date: "2020-01-01", time, ...person(604) })).status).toBe(409);
    const foreign = await fetch(`${BASE}/api/bookings`, { method: "POST", headers: { ...headers(), Origin: "https://evil.example" }, body: JSON.stringify({ serviceId, date, time, ...person(605) }) });
    expect(foreign.status).toBe(403);
  });

  it("limita las reservas por dirección IP", async () => {
    const codes: number[] = [];
    for (let i = 0; i < 8; i++) codes.push((await book({ serviceId, date: "2020-01-01", time: "10:00", ...person(700 + i) }, "10.200.0.1")).status);
    expect(codes.slice(0, 6).every((c) => c === 409)).toBe(true);
    expect(codes.slice(6)).toEqual([429, 429]);
  });
});

describe.skipIf(!run)("privacidad y acceso", () => {
  it("el panel y sus datos no son accesibles sin sesión", async () => {
    for (const p of ["/admin", "/admin/reservas", "/admin/clientes", "/admin/contenido", "/admin/seguridad"]) {
      const r = await fetch(`${BASE}${p}`, { redirect: "manual" });
      expect(r.status, p).toBe(307);
      expect(r.headers.get("location")).toContain("/admin/login");
    }
    expect((await fetch(`${BASE}/api/admin/customers/abc/export`)).status).toBe(401);
    expect((await fetch(`${BASE}/api/admin/upload`, { method: "POST", headers: { Origin: BASE } })).status).toBe(401);
    expect((await fetch(`${BASE}/api/cron/reminders`)).status).toBe(401);
    expect((await fetch(`${BASE}/api/cron/reminders`, { headers: { Authorization: "Bearer mal" } })).status).toBe(401);
  });

  it("la disponibilidad pública no revela datos de clientes", async () => {
    const s = await db.service.findFirstOrThrow({ where: { active: true, deletedAt: null } });
    const d = new Date(Date.now() + 12 * 86_400_000).toISOString().slice(0, 10);
    const body = await (await fetch(`${BASE}/api/availability?serviceId=${s.id}&date=${d}`, { headers: headers() })).text();
    expect(body).not.toMatch(/@|name|phone|email|customer/i);
  });

  it("un enlace de cita inventado no devuelve nada", async () => {
    expect((await fetch(`${BASE}/reserva/${"A".repeat(43)}`)).status).toBe(404);
    expect((await fetch(`${BASE}/api/bookings/${"A".repeat(43)}`, { method: "DELETE", headers: headers() })).status).toBe(404);
  });

  it("envía las cabeceras de seguridad", async () => {
    const r = await fetch(`${BASE}/`);
    expect(r.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
    expect(r.headers.get("strict-transport-security")).toContain("max-age");
    expect(r.headers.get("x-content-type-options")).toBe("nosniff");
    expect(r.headers.get("x-powered-by")).toBeNull();
  });
});
