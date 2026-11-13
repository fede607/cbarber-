import "server-only";
import { Resend } from "resend";
import { db } from "./db";
import { getSettings } from "./settings";
import { formatDateTime, formatDuration } from "./time";

type Appt = {
  id: string;
  serviceName: string;
  durationMin: number;
  startsAt: Date;
  customer: { name: string; email: string };
};

export type EmailType = "confirmation" | "cancellation" | "reschedule" | "reminder" | "admin_notice";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export const appUrl = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const manageUrl = (token: string) => `${appUrl()}/reserva/${token}`;
export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY);

function layout(o: { business: string; heading: string; intro: string; rows: [string, string][]; cta?: { label: string; url: string }; footer: string }) {
  const rows = o.rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:10px 0;border-bottom:1px solid #2a2622;color:#9a9186;font-size:13px;width:38%">${esc(k)}</td><td style="padding:10px 0;border-bottom:1px solid #2a2622;color:#f2eee6;font-size:15px">${esc(v)}</td></tr>`,
    )
    .join("");
  const cta = o.cta
    ? `<p style="margin:28px 0 0"><a href="${esc(o.cta.url)}" style="display:inline-block;background:#c6a15b;color:#0c0b0a;text-decoration:none;font-weight:600;font-size:15px;padding:13px 22px;border-radius:2px">${esc(o.cta.label)}</a></p>`
    : "";
  return `<!doctype html><html lang="es"><body style="margin:0;background:#0c0b0a;font-family:Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0c0b0a"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#161514;border:1px solid #2a2622">
<tr><td style="height:5px;background:repeating-linear-gradient(135deg,#c6a15b 0 10px,#161514 10px 20px,#f2eee6 20px 30px,#161514 30px 40px);background-color:#c6a15b;font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td style="padding:32px 28px">
<p style="margin:0 0 20px;color:#c6a15b;font-size:12px;letter-spacing:2px;text-transform:uppercase">${esc(o.business)}</p>
<h1 style="margin:0 0 12px;color:#f2eee6;font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:26px;line-height:1.2">${esc(o.heading)}</h1>
<p style="margin:0 0 22px;color:#c9c2b6;font-size:15px;line-height:1.55">${esc(o.intro)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
${cta}
<p style="margin:28px 0 0;color:#9a9186;font-size:12px;line-height:1.6">${esc(o.footer)}</p>
</td></tr></table></td></tr></table></body></html>`;
}

function toText(o: { heading: string; intro: string; rows: [string, string][]; cta?: { label: string; url: string }; footer: string }) {
  return [o.heading, "", o.intro, "", ...o.rows.map(([k, v]) => `${k}: ${v}`), "", o.cta ? `${o.cta.label}: ${o.cta.url}` : "", "", o.footer]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
}

async function deliver(type: EmailType, to: string, subject: string, content: Parameters<typeof layout>[0], appointmentId?: string) {
  const log = (status: string, extra: { providerId?: string; error?: string } = {}) =>
    db.emailLog.create({ data: { type, recipient: to, subject, status, appointmentId, ...extra } }).catch(() => undefined);

  if (!emailConfigured()) {
    await log("not_configured");
    return { ok: false as const, reason: "not_configured" };
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "Barbería Carlos <onboarding@resend.dev>",
      to,
      subject,
      html: layout(content),
      text: toText(content),
    });
    if (error) {
      await log("failed", { error: `${error.name}: ${error.message}`.slice(0, 500) });
      return { ok: false as const, reason: error.message };
    }
    await log("sent", { providerId: data?.id });
    return { ok: true as const };
  } catch (e) {
    await log("failed", { error: String(e).slice(0, 500) });
    return { ok: false as const, reason: String(e) };
  }
}

/** Never throws: a failed email must not undo a booking. Every attempt is logged in EmailLog. */
export async function sendAppointmentEmail(type: Exclude<EmailType, "admin_notice">, a: Appt, token?: string, previousStart?: Date) {
  const s = await getSettings();
  const details: [string, string][] = [
    ["Servicio", a.serviceName],
    ["Día y hora", formatDateTime(a.startsAt)],
    ["Duración", formatDuration(a.durationMin)],
    ["Pago", "En efectivo, en la barbería"],
    ["Dirección", `${s.address}, ${s.postalCity}`],
  ];
  const first = a.customer.name.split(" ")[0];
  const footer = `${s.businessName} · ${s.address}, ${s.postalCity} · ${s.phone}. Recibes este mensaje porque reservaste una cita. No es publicidad.`;
  const cta = token ? { label: "Cambiar o cancelar la cita", url: manageUrl(token) } : undefined;

  const variants = {
    confirmation: { subject: `Cita confirmada: ${formatDateTime(a.startsAt)}`, heading: "Tu cita está confirmada", intro: `Hola, ${first}. Carlos te espera. La hora queda reservada solo para ti.`, rows: details, cta },
    reminder: { subject: `Recordatorio: tu cita es ${formatDateTime(a.startsAt)}`, heading: "Tu cita es mañana", intro: `Hola, ${first}. Te recordamos tu cita. Si no puedes venir, cancélala para que otra persona aproveche la hora.`, rows: details, cta },
    reschedule: {
      subject: `Cita cambiada: ${formatDateTime(a.startsAt)}`,
      heading: "Tu cita tiene nueva hora",
      intro: `Hola, ${first}. Tu cita ha cambiado${previousStart ? ` (antes: ${formatDateTime(previousStart)})` : ""}. Estos son los datos actualizados.`,
      rows: details,
      cta,
    },
    cancellation: { subject: `Cita cancelada: ${formatDateTime(a.startsAt)}`, heading: "Tu cita está cancelada", intro: `Hola, ${first}. La cita siguiente ha quedado cancelada y la hora vuelve a estar libre.`, rows: details.slice(0, 2), cta: { label: "Reservar otra cita", url: `${appUrl()}/reservar` } },
  } as const;

  const v = variants[type];
  const result = await deliver(type, a.customer.email, v.subject, { business: s.businessName, heading: v.heading, intro: v.intro, rows: [...v.rows], cta: v.cta, footer }, a.id);

  const notify = process.env.ADMIN_NOTIFY_EMAIL;
  if (notify && type !== "reminder") {
    const label = { confirmation: "Nueva reserva", reschedule: "Reserva cambiada", cancellation: "Reserva cancelada" }[type];
    await deliver(
      "admin_notice",
      notify,
      `${label}: ${a.customer.name}, ${formatDateTime(a.startsAt)}`,
      { business: s.businessName, heading: label, intro: `${a.customer.name} · ${a.serviceName}`, rows: details.slice(0, 4), cta: { label: "Abrir el panel", url: `${appUrl()}/admin/reservas` }, footer: "Aviso interno del sistema de reservas." },
      a.id,
    );
  }
  return result;
}
