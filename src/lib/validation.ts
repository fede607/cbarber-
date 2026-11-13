import { z } from "zod";
import { isDateStr, isTimeStr } from "./time";

const clean = (max: number) =>
  z.string().trim().min(1).max(max).refine((s) => !/[<>\u0000-\u001f]/.test(s), "Contiene caracteres no permitidos");

export const dateStr = z.string().refine(isDateStr, "Fecha no válida");
export const timeStr = z.string().refine(isTimeStr, "Hora no válida");
export const idStr = z.string().regex(/^[a-z0-9]{20,32}$/, "Identificador no válido");

export const phone = z
  .string()
  .trim()
  .transform((s) => s.replace(/[\s().-]/g, ""))
  .refine((s) => /^\+?\d{9,15}$/.test(s), "Teléfono no válido");

export const email = z.string().trim().toLowerCase().max(254).email("Email no válido");

export const bookingSchema = z.object({
  serviceId: idStr,
  date: dateStr,
  time: timeStr,
  name: clean(80).refine((s) => s.length >= 2, "Escribe tu nombre"),
  phone,
  email,
  consent: z.literal(true, { message: "Debes aceptar la política de privacidad" }),
  /** Honeypot: real people never fill it. */
  website: z.string().max(0).optional(),
});

export const rescheduleSchema = z.object({ date: dateStr, time: timeStr });

export const firstError = (e: z.ZodError) => e.issues[0]?.message ?? "Datos no válidos";
