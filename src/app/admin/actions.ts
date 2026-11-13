"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { generateSecret, verify as verifyTotp } from "otplib";
import { z } from "zod";
import { requireAdmin, signIn, signOut } from "@/auth";
import { db } from "@/lib/db";
import { BookingError, cancelBooking, createBooking, rescheduleBooking } from "@/lib/booking";
import { sendAppointmentEmail } from "@/lib/email";
import { manageTokenFor } from "@/lib/tokens";
import { isDateStr, localToUtc, timeToMinutes } from "@/lib/time";
import { dateStr, email, idStr, phone, timeStr } from "@/lib/validation";

type FD = FormData;

const text = (max: number, min = 0) => z.string().trim().min(min).max(max).refine((s) => !/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(s), "Contiene caracteres no permitidos");
const url = z.string().trim().max(500).refine((s) => s === "" || s.startsWith("/") || /^https:\/\/[^\s<>"']+$/.test(s), "La dirección debe empezar por https://");
const int = (min: number, max: number) => z.coerce.number().int().min(min).max(max);
const euros = z.string().trim().optional().default("0").transform((s) => Math.round(Number(s.replace(",", ".")) * 100)).refine((n) => Number.isFinite(n) && n >= 0 && n <= 100_000, "Precio no válido");
const bool = z.preprocess((v) => v === "on" || v === "true", z.boolean());

const obj = (fd: FD) => Object.fromEntries(fd.entries());

/** Redirects back with a status message shown by <Flash />. */
function back(path: string, kind: "ok" | "error", message: string): never {
  revalidatePath("/", "layout");
  redirect(`${path}${path.includes("?") ? "&" : "?"}${kind}=${encodeURIComponent(message)}`);
}

function fail(path: string, e: unknown): never {
  if (e instanceof z.ZodError) back(path, "error", e.issues[0]?.message ?? "Datos no válidos");
  if (e instanceof BookingError) back(path, "error", e.message);
  throw e;
}

/* ───────── Sesión ───────── */

export async function loginAction(_prev: string | undefined, fd: FD): Promise<string | undefined> {
  try {
    await signIn("credentials", { email: fd.get("email"), password: fd.get("password"), code: fd.get("code"), redirectTo: "/admin" });
  } catch (e) {
    if (e instanceof AuthError) return "Email, contraseña o código incorrectos. Tras varios intentos fallidos el acceso se bloquea 15 minutos.";
    throw e;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/admin/login" });
}

/* ───────── Reservas ───────── */

const manualBooking = z.object({
  serviceId: idStr,
  date: dateStr,
  time: timeStr,
  name: text(80, 2),
  phone,
  email,
  notes: text(500).optional().default(""),
  notify: bool,
});

export async function createAppointmentAction(fd: FD) {
  await requireAdmin();
  const path = "/admin/reservas/nueva";
  let id: string;
  try {
    const { notify, ...d } = manualBooking.parse(obj(fd));
    const { appointment, token } = await createBooking({ ...d, source: "ADMIN", skipRules: true });
    if (notify) await sendAppointmentEmail("confirmation", appointment, token);
    id = appointment.id;
  } catch (e) {
    fail(path, e);
  }
  back(`/admin/reservas/${id}`, "ok", "Reserva creada");
}

const editBooking = z.object({ id: idStr, serviceId: idStr, date: dateStr, time: timeStr, notes: text(500).optional().default(""), notify: bool });

export async function updateAppointmentAction(fd: FD) {
  await requireAdmin();
  const raw = obj(fd);
  const path = `/admin/reservas/${String(raw.id ?? "")}`;
  try {
    const d = editBooking.parse(raw);
    const { previous, updated } = await rescheduleBooking(d.id, d.date, d.time, "admin", d.serviceId);
    await db.appointment.update({ where: { id: d.id }, data: { notes: d.notes } });
    const moved = previous.startsAt.getTime() !== updated.startsAt.getTime();
    if (d.notify && moved) await sendAppointmentEmail("reschedule", updated, manageTokenFor(updated.id), previous.startsAt);
  } catch (e) {
    fail(path, e);
  }
  back(path, "ok", "Cambios guardados");
}

const optionalEuros = z.string().trim().optional().transform((s) => (s ? Math.round(Number(s.replace(",", ".")) * 100) : undefined)).refine((n) => n === undefined || (Number.isFinite(n) && n >= 0 && n <= 100_000), "Importe no válido");

const statusChange = z.object({ id: idStr, amount: optionalEuros, status: z.enum(["PENDING", "COMPLETED", "CANCELLED", "NO_SHOW"]), notify: bool.optional(), returnTo: z.string().startsWith("/admin").max(300).optional() });

export async function setStatusAction(fd: FD) {
  await requireAdmin();
  const parsed = statusChange.safeParse(obj(fd));
  if (!parsed.success) back("/admin/reservas", "error", parsed.error.issues[0]?.message ?? "Datos no válidos");
  const d = parsed.data;
  const path = d.returnTo ?? "/admin/reservas";
  try {
    if (d.status === "CANCELLED") {
      const a = await cancelBooking(d.id, "admin");
      if (d.notify !== false) await sendAppointmentEmail("cancellation", a);
    } else {
      // Re-activating a cancelled appointment can collide with a newer one: the database constraint decides.
      await db.appointment.update({
        where: { id: d.id },
        data: { status: d.status, completedAt: d.status === "COMPLETED" ? new Date() : null, cancelledAt: null, ...(d.status === "COMPLETED" && d.amount !== undefined ? { priceCents: d.amount } : {}) },
      });
    }
  } catch (e) {
    if (e instanceof BookingError) back(path, "error", e.message);
    if (String((e as Error).message).includes("Appointment_no_overlap") || String((e as Error).message).includes("23P01"))
      back(path, "error", "Esa hora ya está ocupada por otra cita.");
    throw e;
  }
  back(path, "ok", { PENDING: "Cita reabierta", COMPLETED: "Cita completada", CANCELLED: "Cita cancelada", NO_SHOW: "Marcada como no presentada" }[d.status]);
}

/* ───────── Clientes (RGPD) ───────── */

export async function anonymizeCustomerAction(fd: FD) {
  await requireAdmin();
  const id = idStr.parse(fd.get("id"));
  const pending = await db.appointment.count({ where: { customerId: id, status: "PENDING", startsAt: { gt: new Date() } } });
  if (pending > 0) back("/admin/clientes", "error", "Este cliente tiene citas pendientes. Cancélalas antes de borrar sus datos.");
  await db.customer.update({ where: { id }, data: { name: "Cliente eliminado", email: `eliminado-${id}@anon.invalid`, phone: "", anonymizedAt: new Date() } });
  await db.emailLog.updateMany({ where: { appointment: { customerId: id } }, data: { recipient: "eliminado" } });
  await db.auditLog.create({ data: { action: "customer_anonymized", detail: id } });
  back("/admin/clientes", "ok", "Datos personales borrados. Las citas se conservan sin identificar para las estadísticas.");
}

/* ───────── Servicios ───────── */

const service = z.object({
  name: text(60, 2),
  description: text(240).optional().default(""),
  price: euros,
  durationMin: int(5, 480),
  imageUrl: url.optional().default(""),
  sortOrder: int(0, 999).optional().default(0),
  active: bool,
});

export async function saveServiceAction(fd: FD) {
  await requireAdmin();
  const path = "/admin/servicios";
  try {
    const { price, ...d } = service.parse(obj(fd));
    const data = { ...d, priceCents: price };
    const id = fd.get("id");
    if (id) await db.service.update({ where: { id: idStr.parse(id) }, data });
    else await db.service.create({ data });
  } catch (e) {
    fail(path, e);
  }
  back(path, "ok", "Servicio guardado");
}

export async function deleteServiceAction(fd: FD) {
  await requireAdmin();
  const id = idStr.parse(fd.get("id"));
  // Soft delete: past appointments keep pointing at it, so history and revenue stay intact.
  await db.service.update({ where: { id }, data: { deletedAt: new Date(), active: false } });
  back("/admin/servicios", "ok", "Servicio eliminado");
}

/* ───────── Horarios ───────── */

export async function saveHoursAction(fd: FD) {
  await requireAdmin();
  const path = "/admin/horarios";
  try {
    const rows = [0, 1, 2, 3, 4, 5, 6].map((wd) => {
      const closed = fd.get(`closed-${wd}`) === "on";
      const open = timeStr.parse(fd.get(`open-${wd}`) || "10:00");
      const close = timeStr.parse(fd.get(`close-${wd}`) || "20:00");
      const bs = String(fd.get(`bstart-${wd}`) ?? "");
      const be = String(fd.get(`bend-${wd}`) ?? "");
      const hasBreak = Boolean(bs && be);
      const row = {
        weekday: wd,
        closed,
        openMin: timeToMinutes(open),
        closeMin: timeToMinutes(close),
        breakStartMin: hasBreak ? timeToMinutes(timeStr.parse(bs)) : null,
        breakEndMin: hasBreak ? timeToMinutes(timeStr.parse(be)) : null,
      };
      if (row.closeMin <= row.openMin) throw new BookingError("INVALID", "La hora de cierre debe ser posterior a la de apertura.");
      if (hasBreak && !(row.breakStartMin! >= row.openMin && row.breakEndMin! <= row.closeMin && row.breakEndMin! > row.breakStartMin!))
        throw new BookingError("INVALID", "El descanso debe quedar dentro del horario de apertura.");
      return row;
    });
    await db.$transaction(rows.map((r) => db.weeklyHours.upsert({ where: { weekday: r.weekday }, update: r, create: r })));
  } catch (e) {
    fail(path, e);
  }
  back(path, "ok", "Horario guardado. El calendario público ya lo usa.");
}

const rules = z.object({ slotStepMin: int(5, 120), minNoticeMin: int(0, 10080), maxAdvanceDays: int(1, 365), cancelLimitMin: int(0, 10080) });

export async function saveRulesAction(fd: FD) {
  await requireAdmin();
  try {
    await db.setting.update({ where: { id: 1 }, data: rules.parse(obj(fd)) });
  } catch (e) {
    fail("/admin/horarios", e);
  }
  back("/admin/horarios", "ok", "Reglas de reserva guardadas");
}

export async function addClosedDayAction(fd: FD) {
  await requireAdmin();
  const path = "/admin/horarios";
  let warn = 0;
  try {
    const d = z.object({ from: dateStr, to: z.string().optional(), reason: text(80).optional().default("") }).parse(obj(fd));
    const to = d.to && isDateStr(d.to) && d.to >= d.from ? d.to : d.from;
    const dates: string[] = [];
    for (let cur = new Date(`${d.from}T12:00:00Z`); cur.toISOString().slice(0, 10) <= to && dates.length < 60; cur.setUTCDate(cur.getUTCDate() + 1))
      dates.push(cur.toISOString().slice(0, 10));
    await db.$transaction(dates.map((date) => db.closedDay.upsert({ where: { date }, update: { reason: d.reason }, create: { date, reason: d.reason } })));
    const end = new Date(`${to}T12:00:00Z`);
    end.setUTCDate(end.getUTCDate() + 1);
    warn = await db.appointment.count({ where: { status: "PENDING", startsAt: { gte: localToUtc(d.from, 0), lt: localToUtc(end.toISOString().slice(0, 10), 0) } } });
  } catch (e) {
    fail(path, e);
  }
  back(path, "ok", warn ? `Día cerrado. Atención: hay ${warn} cita(s) ya reservadas en esas fechas; cancélalas o muévelas desde Reservas.` : "Día cerrado. Ya no admite reservas.");
}

export async function removeClosedDayAction(fd: FD) {
  await requireAdmin();
  await db.closedDay.delete({ where: { date: dateStr.parse(fd.get("date")) } });
  back("/admin/horarios", "ok", "Día reabierto");
}

export async function addBlockAction(fd: FD) {
  await requireAdmin();
  const path = "/admin/horarios";
  let warn = 0;
  try {
    const d = z.object({ date: dateStr, start: timeStr, end: timeStr, reason: text(80).optional().default("") }).parse(obj(fd));
    const startsAt = localToUtc(d.date, timeToMinutes(d.start));
    const endsAt = localToUtc(d.date, timeToMinutes(d.end));
    if (endsAt <= startsAt) throw new BookingError("INVALID", "La hora final debe ser posterior a la inicial.");
    await db.timeBlock.create({ data: { startsAt, endsAt, reason: d.reason } });
    warn = await db.appointment.count({ where: { status: "PENDING", startsAt: { lt: endsAt }, endsAt: { gt: startsAt } } });
  } catch (e) {
    fail(path, e);
  }
  back(path, "ok", warn ? `Horas bloqueadas. Atención: ${warn} cita(s) ya reservadas coinciden con el bloqueo.` : "Horas bloqueadas");
}

export async function removeBlockAction(fd: FD) {
  await requireAdmin();
  await db.timeBlock.delete({ where: { id: idStr.parse(fd.get("id")) } });
  back("/admin/horarios", "ok", "Bloqueo eliminado");
}

/* ───────── Contenido ───────── */

const content = z.object({
  businessName: text(60, 2),
  heroTitle: text(90, 2),
  heroSubtitle: text(240),
  aboutTitle: text(90),
  aboutText: z.string().trim().max(3000).refine((s) => !/[<>]/.test(s), "El texto no puede contener < ni >"),
  heroImage: url,
  aboutImage: url,
  address: text(120),
  postalCity: text(80),
  phone: text(30),
  whatsapp: text(30).optional().default(""),
  contactEmail: email,
  instagram: url.optional().default(""),
  tiktok: url.optional().default(""),
  mapLat: z.coerce.number().min(-90).max(90),
  mapLng: z.coerce.number().min(-180).max(180),
  ratingValue: z.string().transform((s) => Number(s.replace(",", "."))).refine((n) => n >= 0 && n <= 5, "La valoración va de 0 a 5"),
  ratingCount: int(0, 100000),
  reviewsUrl: url.optional().default(""),
  showRating: bool,
  legalOwnerName: text(120),
  legalOwnerId: text(30),
  legalAddress: text(200),
});

export async function saveContentAction(fd: FD) {
  await requireAdmin();
  try {
    await db.setting.update({ where: { id: 1 }, data: content.parse(obj(fd)) });
  } catch (e) {
    fail("/admin/contenido", e);
  }
  back("/admin/contenido", "ok", "Contenido guardado. La web ya muestra los cambios.");
}

export async function addGalleryImageAction(fd: FD) {
  await requireAdmin();
  try {
    const d = z.object({ url: url.refine((s) => s !== "", "Sube una imagen o pega su dirección"), alt: text(140).optional().default("") }).parse(obj(fd));
    const last = await db.galleryImage.aggregate({ _max: { sortOrder: true } });
    await db.galleryImage.create({ data: { ...d, sortOrder: (last._max.sortOrder ?? 0) + 1 } });
  } catch (e) {
    fail("/admin/contenido", e);
  }
  back("/admin/contenido#galeria", "ok", "Imagen añadida a la galería");
}

export async function removeGalleryImageAction(fd: FD) {
  await requireAdmin();
  await db.galleryImage.delete({ where: { id: idStr.parse(fd.get("id")) } });
  back("/admin/contenido#galeria", "ok", "Imagen eliminada");
}

export async function addReviewAction(fd: FD) {
  await requireAdmin();
  try {
    const d = z.object({ author: text(60, 2), text: text(600, 5), rating: int(1, 5), source: text(30).optional().default("Google") }).parse(obj(fd));
    await db.review.create({ data: d });
  } catch (e) {
    fail("/admin/contenido", e);
  }
  back("/admin/contenido#resenas", "ok", "Reseña añadida");
}

export async function toggleReviewAction(fd: FD) {
  await requireAdmin();
  const id = idStr.parse(fd.get("id"));
  const r = await db.review.findUniqueOrThrow({ where: { id } });
  await db.review.update({ where: { id }, data: { visible: !r.visible } });
  back("/admin/contenido#resenas", "ok", r.visible ? "Reseña oculta" : "Reseña publicada en la web");
}

const reviewEdit = z.object({ id: idStr, author: text(60, 2), text: text(600, 5), rating: int(1, 5), source: text(30).optional().default("Google") });

export async function updateReviewAction(fd: FD) {
  await requireAdmin();
  try {
    const { id, ...d } = reviewEdit.parse(obj(fd));
    await db.review.update({ where: { id }, data: d });
  } catch (e) {
    fail("/admin/contenido", e);
  }
  back("/admin/contenido#resenas", "ok", "Reseña guardada");
}

export async function removeReviewAction(fd: FD) {
  await requireAdmin();
  await db.review.delete({ where: { id: idStr.parse(fd.get("id")) } });
  back("/admin/contenido#resenas", "ok", "Reseña eliminada");
}

/* ───────── Seguridad ───────── */

export async function changePasswordAction(fd: FD) {
  const session = await requireAdmin();
  const path = "/admin/seguridad";
  const d = z.object({ current: z.string().max(200), next: z.string().min(12, "La contraseña nueva debe tener al menos 12 caracteres").max(200), repeat: z.string() }).safeParse(obj(fd));
  if (!d.success) back(path, "error", d.error.issues[0].message);
  if (d.data.next !== d.data.repeat) back(path, "error", "Las dos contraseñas nuevas no coinciden.");
  const user = await db.adminUser.findUnique({ where: { email: session.user!.email! } });
  if (!user || !(await bcrypt.compare(d.data.current, user.passwordHash))) back(path, "error", "La contraseña actual no es correcta.");
  await db.adminUser.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(d.data.next, 12) } });
  await db.auditLog.create({ data: { action: "password_changed", detail: user.email } });
  back(path, "ok", "Contraseña cambiada");
}

export async function startTotpAction() {
  const session = await requireAdmin();
  await db.adminUser.update({ where: { email: session.user!.email! }, data: { totpSecret: generateSecret(), totpEnabled: false } });
  back("/admin/seguridad", "ok", "Escanea el código con tu app y escribe el número de 6 cifras para activarlo.");
}

export async function confirmTotpAction(fd: FD) {
  const session = await requireAdmin();
  const user = await db.adminUser.findUnique({ where: { email: session.user!.email! } });
  const code = String(fd.get("code") ?? "").replace(/\s/g, "");
  const res = user?.totpSecret && /^\d{6}$/.test(code) ? await verifyTotp({ secret: user.totpSecret, token: code, epochTolerance: 30 }).catch(() => null) : null;
  if (!res?.valid) back("/admin/seguridad", "error", "El código no es correcto. Comprueba la hora del móvil y prueba otra vez.");
  await db.adminUser.update({ where: { id: user!.id }, data: { totpEnabled: true } });
  await db.auditLog.create({ data: { action: "totp_enabled", detail: user!.email } });
  back("/admin/seguridad", "ok", "Verificación en dos pasos activada");
}

export async function disableTotpAction(fd: FD) {
  const session = await requireAdmin();
  const user = await db.adminUser.findUnique({ where: { email: session.user!.email! } });
  if (!user || !(await bcrypt.compare(String(fd.get("password") ?? ""), user.passwordHash))) back("/admin/seguridad", "error", "La contraseña no es correcta.");
  await db.adminUser.update({ where: { id: user.id }, data: { totpEnabled: false, totpSecret: null } });
  await db.auditLog.create({ data: { action: "totp_disabled", detail: user.email } });
  back("/admin/seguridad", "ok", "Verificación en dos pasos desactivada");
}
