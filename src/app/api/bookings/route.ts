import { createBooking } from "@/lib/booking";
import { sendAppointmentEmail } from "@/lib/email";
import { errorResponse, readJson, sameOrigin } from "@/lib/http";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";
import { bookingSchema, firstError } from "@/lib/validation";

export async function POST(req: Request) {
  if (!(await sameOrigin())) return Response.json({ error: "Origen no permitido" }, { status: 403 });
  if (!(await rateLimit(`book:${await clientIp()}`, 6, 3600))) return tooMany();

  const parsed = bookingSchema.safeParse(await readJson(req));
  if (!parsed.success) return Response.json({ error: firstError(parsed.error) }, { status: 400 });
  const { serviceId, date, time, name, phone, email } = parsed.data;
  const data = { serviceId, date, time, name, phone, email };

  try {
    const { appointment, token } = await createBooking({ ...data, source: "WEB" });
    const mail = await sendAppointmentEmail("confirmation", appointment, token);
    return Response.json(
      {
        ok: true,
        token,
        emailSent: mail.ok,
        appointment: {
          serviceName: appointment.serviceName,
          startsAt: appointment.startsAt,
          durationMin: appointment.durationMin,
          priceCents: appointment.priceCents,
        },
      },
      { status: 201 },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
