"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check } from "lucide-react";
import { DateTimePicker, type Picked } from "./DateTimePicker";

type Service = { id: string; name: string; description: string; priceLabel: string; durationLabel: string };
type Done = { token: string; emailSent: boolean; when: string };

const STEPS = ["Servicio", "Día y hora", "Tus datos"];

export function BookingFlow({ services, initialServiceId, today, lastDate }: { services: Service[]; initialServiceId?: string; today: string; lastDate: string }) {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(initialServiceId ? 1 : 0);
  const [serviceId, setServiceId] = useState(initialServiceId ?? "");
  const [picked, setPicked] = useState<Picked>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", consent: false, website: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState("");
  const [done, setDone] = useState<Done | null>(null);
  const top = useRef<HTMLDivElement>(null);
  const service = services.find((s) => s.id === serviceId);

  const go = (n: number) => {
    setStep(n);
    setFailure("");
    top.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };

  const whenLabel = (p: NonNullable<Picked>) =>
    `${new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${p.date}T12:00:00Z`))}, ${p.time} h`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!picked || !service) return;
    const errs: Record<string, string> = {};
    if (form.name.trim().length < 2) errs.name = "Escribe tu nombre.";
    if (!/^\+?\d{9,15}$/.test(form.phone.replace(/[\s().-]/g, ""))) errs.phone = "Escribe un teléfono válido, por ejemplo 600 123 456.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = "Escribe un email válido: ahí te llega la confirmación.";
    if (!form.consent) errs.consent = "Necesitamos tu permiso para guardar estos datos.";
    setErrors(errs);
    if (Object.keys(errs).length) {
      document.getElementById(Object.keys(errs)[0])?.focus();
      return;
    }
    setSending(true);
    setFailure("");
    try {
      const r = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId, ...picked, ...form }),
      });
      const j = await r.json();
      if (!r.ok) {
        setFailure(j.error ?? "No hemos podido guardar la reserva.");
        if (j.code === "SLOT_TAKEN") {
          setPicked(null);
          setStep(1);
        }
        return;
      }
      setDone({ token: j.token, emailSent: j.emailSent, when: whenLabel(picked) });
      top.current?.scrollIntoView({ block: "start" });
    } catch {
      setFailure("No hay conexión. Comprueba tu red y vuelve a intentarlo.");
    } finally {
      setSending(false);
    }
  }

  if (done && service) {
    return (
      <div ref={top} className="card mx-auto max-w-xl p-8 text-center md:p-12">
        <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-full bg-brass text-ink">
          <Check size={28} aria-hidden />
        </div>
        <h2 className="display text-4xl">Cita reservada</h2>
        <p className="mt-4 text-lg">
          {service.name} · <span className="capitalize">{done.when}</span>
        </p>
        <p className="mt-3 text-ash">
          {done.emailSent
            ? `Te hemos enviado la confirmación a ${form.email.trim()}. Desde ese email puedes cambiar o cancelar la cita.`
            : "La hora queda bloqueada para ti. Guarda el enlace de abajo: con él puedes cambiar o cancelar la cita."}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href={`/reserva/${done.token}`} className="btn btn-primary">
            Ver mi cita
          </Link>
          <Link href="/" className="btn btn-ghost">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div ref={top} className="scroll-mt-24">
      <ol className="mb-3 flex gap-6 text-sm" aria-label="Pasos de la reserva">
        {STEPS.map((label, i) => (
          <li key={label} aria-current={i === step ? "step" : undefined} className={i === step ? "text-bone" : i < step ? "text-brass" : "text-ash/60"}>
            <button type="button" disabled={i >= step} onClick={() => go(i)} className="flex items-center gap-2 disabled:cursor-default">
              <span className="num">{i + 1}</span>
              <span className={i === step ? "" : "hidden sm:inline"}>{label}</span>
            </button>
          </li>
        ))}
      </ol>
      <div className="mb-10 h-1.5 bg-graphite" role="progressbar" aria-valuemin={1} aria-valuemax={3} aria-valuenow={step + 1} aria-label="Progreso de la reserva">
        <div className="pole h-full transition-[width] duration-500 ease-out" style={{ width: `${((step + 1) / 3) * 100}%` }} />
      </div>

      {failure && (
        <p role="alert" className="mb-6 border border-danger/50 bg-danger/10 p-4 text-danger">
          {failure}
        </p>
      )}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={step} initial={reduce ? false : { opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={reduce ? undefined : { opacity: 0, x: -16 }} transition={{ duration: 0.25 }}>
          {step === 0 && (
            <fieldset>
              <legend className="display mb-6 text-3xl md:text-4xl">¿Qué te hacemos?</legend>
              {services.length === 0 && <p className="text-ash">Ahora mismo no hay servicios disponibles para reservar.</p>}
              <div className="grid gap-3 md:grid-cols-2">
                {services.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={s.id === serviceId}
                    onClick={() => {
                      setServiceId(s.id);
                      setPicked(null);
                      go(1);
                    }}
                    className={`card grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 p-5 text-left transition-colors hover:border-brass ${s.id === serviceId ? "border-brass" : ""}`}
                  >
                    <span className="font-display text-2xl">{s.name}</span>
                    <span className="num text-lg text-brass">{s.priceLabel}</span>
                    <span className="text-sm text-ash">{s.description}</span>
                    <span className="num text-right text-sm text-ash">{s.durationLabel}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {step === 1 && service && (
            <div>
              <h2 className="display mb-2 text-3xl md:text-4xl">¿Cuándo te viene bien?</h2>
              <p className="mb-8 text-ash">
                {service.name} · {service.durationLabel} · {service.priceLabel}
              </p>
              <DateTimePicker serviceId={serviceId} today={today} lastDate={lastDate} value={picked} onChange={setPicked} />
              <div className="mt-10 flex flex-wrap justify-between gap-3">
                <button type="button" className="btn btn-ghost" onClick={() => go(0)}>
                  Cambiar servicio
                </button>
                <button type="button" className="btn btn-primary" disabled={!picked} onClick={() => go(2)}>
                  Continuar
                </button>
              </div>
            </div>
          )}

          {step === 2 && service && picked && (
            <form onSubmit={submit} noValidate className="grid gap-10 md:grid-cols-[1.1fr_0.9fr]">
              <div>
                <h2 className="display mb-6 text-3xl md:text-4xl">¿A nombre de quién?</h2>
                <div className="space-y-5">
                  <Field id="name" label="Nombre y apellidos" error={errors.name}>
                    <input id="name" className="field" autoComplete="name" value={form.name} maxLength={80} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-e" : undefined} />
                  </Field>
                  <Field id="phone" label="Teléfono" error={errors.phone} hint="Solo lo usa Carlos si hay un imprevisto con tu cita.">
                    <input id="phone" className="field" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} maxLength={20} onChange={(e) => setForm({ ...form, phone: e.target.value })} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "phone-e" : undefined} />
                  </Field>
                  <Field id="email" label="Email" error={errors.email} hint="Te enviamos la confirmación y un recordatorio el día antes.">
                    <input id="email" className="field" type="email" inputMode="email" autoComplete="email" value={form.email} maxLength={254} onChange={(e) => setForm({ ...form, email: e.target.value })} aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-e" : undefined} />
                  </Field>
                  {/* Honeypot: hidden from people, tempting for bots. */}
                  <div className="absolute -left-[9999px]" aria-hidden>
                    <label>
                      No rellenes este campo
                      <input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
                    </label>
                  </div>
                  <div>
                    <label className="flex cursor-pointer items-start gap-3 text-sm">
                      <input id="consent" type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-[#c6a15b]" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} aria-invalid={!!errors.consent} />
                      <span className="text-ash">
                        Acepto que se guarden mi nombre, teléfono y email para gestionar esta cita, según la{" "}
                        <Link href="/privacidad" target="_blank" className="text-bone underline underline-offset-4">
                          política de privacidad
                        </Link>
                        .
                      </span>
                    </label>
                    {errors.consent && (
                      <p className="mt-2 text-sm text-danger" role="alert">
                        {errors.consent}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <aside className="card h-fit p-6">
                <p className="eyebrow mb-4">Tu cita</p>
                <dl className="space-y-3">
                  <Row k="Servicio" v={service.name} />
                  <Row k="Cuándo" v={<span className="capitalize">{whenLabel(picked)}</span>} />
                  <Row k="Duración" v={service.durationLabel} />
                  <Row k="Precio" v={service.priceLabel} />
                </dl>
                <p className="mt-4 text-sm text-ash">Se paga en la barbería.</p>
                <button type="submit" className="btn btn-primary mt-6 w-full" disabled={sending}>
                  {sending ? "Reservando…" : "Confirmar reserva"}
                </button>
                <button type="button" className="btn btn-ghost mt-3 w-full" onClick={() => go(1)} disabled={sending}>
                  Cambiar día u hora
                </button>
              </aside>
            </form>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-e`} className="mt-2 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="hint">{hint}</p>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line pb-3">
      <dt className="text-sm text-ash">{k}</dt>
      <dd className="text-right">{v}</dd>
    </div>
  );
}
