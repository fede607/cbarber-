import "server-only";
import { Prisma, type AppointmentSource } from "@prisma/client";
import { db } from "./db";
import { getDaySlots } from "./availability";
import { getSettings } from "./settings";
import { hashToken, manageTokenFor, newToken } from "./tokens";
import { localToUtc, timeToMinutes } from "./time";

export class BookingError extends Error {
  constructor(
    public code: "SLOT_TAKEN" | "NOT_FOUND" | "NOT_ALLOWED" | "TOO_MANY" | "INVALID",
    message: string,
  ) {
    super(message);
  }
}

/** One barber, one chair: every write to the agenda is serialised through this lock. */
const lockAgenda = (tx: Prisma.TransactionClient) => tx.$executeRaw`SELECT pg_advisory_xact_lock(727001)`;

const TAKEN = "Esa hora acaba de reservarse. Elige otra, por favor.";

/** PostgreSQL 23P01 = exclusion constraint violated, i.e. the range overlaps another appointment. */
function isOverlap(e: unknown) {
  const s = e instanceof Error ? `${e.message} ${(e as { code?: string }).code ?? ""}` : "";
  return s.includes("23P01") || s.includes("Appointment_no_overlap");
}

async function guarded<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (isOverlap(e)) throw new BookingError("SLOT_TAKEN", TAKEN);
    throw e;
  }
}

export type BookingInput = {
  serviceId: string;
  date: string;
  time: string;
  name: string;
  phone: string;
  email: string;
  source: AppointmentSource;
  notes?: string;
  /** Admin bookings may ignore opening hours and notice; they can never overlap. */
  skipRules?: boolean;
};

export async function createBooking(input: BookingInput) {
  const settings = await getSettings();
  const appointment = await guarded(() =>
    db.$transaction(async (tx) => {
      await lockAgenda(tx);

      const service = await tx.service.findFirst({ where: { id: input.serviceId, deletedAt: null, ...(input.skipRules ? {} : { active: true }) } });
      if (!service) throw new BookingError("NOT_FOUND", "Ese servicio ya no está disponible.");

      const startsAt = localToUtc(input.date, timeToMinutes(input.time));
      const endsAt = new Date(startsAt.getTime() + service.durationMin * 60_000);

      if (!input.skipRules) {
        const slots = await getDaySlots(tx, input.date, service.durationMin, settings);
        if (!slots.some((s) => s.time === input.time)) throw new BookingError("SLOT_TAKEN", TAKEN);

        const upcoming = await tx.appointment.count({
          where: { status: "PENDING", startsAt: { gt: new Date() }, customer: { email: input.email } },
        });
        if (upcoming >= 3) throw new BookingError("TOO_MANY", "Ya tienes 3 citas pendientes. Cancela alguna antes de reservar otra.");
      }

      const customer = await tx.customer.upsert({
        where: { email: input.email },
        update: { name: input.name, phone: input.phone, anonymizedAt: null, ...(input.source === "WEB" ? { consentAt: new Date() } : {}) },
        create: { name: input.name, phone: input.phone, email: input.email, consentAt: input.source === "WEB" ? new Date() : null },
      });

      const created = await tx.appointment.create({
        data: {
          customerId: customer.id,
          serviceId: service.id,
          serviceName: service.name,
          priceCents: service.priceCents,
          durationMin: service.durationMin,
          startsAt,
          endsAt,
          source: input.source,
          notes: input.notes ?? "",
          manageTokenHash: hashToken(newToken()),
        },
      });
      return tx.appointment.update({
        where: { id: created.id },
        data: { manageTokenHash: hashToken(manageTokenFor(created.id)) },
        include: { customer: true },
      });
    }),
  );

  return { appointment, token: manageTokenFor(appointment.id) };
}

export async function findByToken(token: string) {
  return db.appointment.findUnique({ where: { manageTokenHash: hashToken(token) }, include: { customer: true } });
}

function assertCustomerCanChange(a: { status: string; startsAt: Date }, cancelLimitMin: number) {
  if (a.status !== "PENDING") throw new BookingError("NOT_ALLOWED", "Esta cita ya no se puede modificar.");
  if (a.startsAt.getTime() - Date.now() < cancelLimitMin * 60_000)
    throw new BookingError("NOT_ALLOWED", "Queda muy poco para la cita. Llama a Carlos para cambiarla o cancelarla.");
}

export async function cancelBooking(id: string, by: "customer" | "admin") {
  const settings = await getSettings();
  return db.$transaction(async (tx) => {
    await lockAgenda(tx);
    const a = await tx.appointment.findUnique({ where: { id } });
    if (!a) throw new BookingError("NOT_FOUND", "No encontramos esa cita.");
    if (a.status === "CANCELLED") throw new BookingError("NOT_ALLOWED", "Esta cita ya estaba cancelada.");
    if (by === "customer") assertCustomerCanChange(a, settings.cancelLimitMin);
    return tx.appointment.update({ where: { id }, data: { status: "CANCELLED", cancelledAt: new Date() }, include: { customer: true } });
  });
}

export async function rescheduleBooking(
  id: string,
  date: string,
  time: string,
  by: "customer" | "admin",
  serviceId?: string,
) {
  const settings = await getSettings();
  return guarded(() =>
    db.$transaction(async (tx) => {
      await lockAgenda(tx);
      const a = await tx.appointment.findUnique({ where: { id } });
      if (!a) throw new BookingError("NOT_FOUND", "No encontramos esa cita.");
      if (by === "customer") assertCustomerCanChange(a, settings.cancelLimitMin);
      else if (a.status === "CANCELLED") throw new BookingError("NOT_ALLOWED", "Una cita cancelada no se puede mover. Crea una nueva.");

      let snapshot = { serviceId: a.serviceId, serviceName: a.serviceName, priceCents: a.priceCents, durationMin: a.durationMin };
      if (serviceId && serviceId !== a.serviceId) {
        const s = await tx.service.findFirst({ where: { id: serviceId, deletedAt: null } });
        if (!s) throw new BookingError("NOT_FOUND", "Ese servicio ya no está disponible.");
        snapshot = { serviceId: s.id, serviceName: s.name, priceCents: s.priceCents, durationMin: s.durationMin };
      }

      if (by === "customer") {
        const slots = await getDaySlots(tx, date, snapshot.durationMin, settings, { excludeAppointmentId: id });
        if (!slots.some((s) => s.time === time)) throw new BookingError("SLOT_TAKEN", TAKEN);
      }

      const startsAt = localToUtc(date, timeToMinutes(time));
      const endsAt = new Date(startsAt.getTime() + snapshot.durationMin * 60_000);
      const updated = await tx.appointment.update({
        where: { id },
        data: { ...snapshot, startsAt, endsAt, reminderSentAt: null },
        include: { customer: true },
      });
      return { previous: a, updated };
    }),
  );
}
