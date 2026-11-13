import Link from "next/link";
import { ArrowRight, ArrowUpRight, Star } from "lucide-react";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getNextSlot } from "@/lib/availability";
import { WEEKDAYS, WEEK_ORDER, addDays, dateStrOf, formatDuration, formatLongDate, minutesToTime, timeStrOf, todayStr, weekdayOf } from "@/lib/time";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MapEmbed } from "@/components/site/MapEmbed";
import { HeroTitle, ParallaxPhoto, ScrollProgress, StickyCta } from "@/components/site/Motion";
import { Reveal } from "@/components/Reveal";

function nextSlotLabel(iso: string) {
  const d = new Date(iso);
  const day = dateStrOf(d);
  const today = todayStr();
  const prefix = day === today ? "hoy" : day === addDays(today, 1) ? "mañana" : formatLongDate(d);
  return `${prefix}, ${timeStrOf(d)} h`;
}

export default async function Home() {
  const s = await getSettings();
  const [services, gallery, reviews, hours, closedDays] = await Promise.all([
    db.service.findMany({ where: { active: true, deletedAt: null }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    db.galleryImage.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    db.review.findMany({ where: { visible: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }], take: 6 }),
    db.weeklyHours.findMany(),
    db.closedDay.findMany({ where: { date: { gte: todayStr() } }, orderBy: { date: "asc" }, take: 4 }),
  ]);
  const shortest = services.length ? Math.min(...services.map((x) => x.durationMin)) : 0;
  const next = shortest ? await getNextSlot(db, shortest, s) : null;
  const todayWd = weekdayOf(todayStr());

  // Sections alternate white and black whatever is switched on in the panel.
  const tones = ["servicios", "sobre", ...(gallery.length ? ["galeria"] : []), ...(reviews.length ? ["resenas"] : []), "horario", "ubicacion"];
  const tone = (id: string) => (tones.indexOf(id) % 2 === 0 ? "light bg-ink text-bone" : "bg-ink text-bone");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BarberShop",
    name: s.businessName,
    telephone: s.phone,
    paymentAccepted: "Cash",
    address: { "@type": "PostalAddress", streetAddress: s.address, addressLocality: s.postalCity, addressCountry: "ES" },
    geo: { "@type": "GeoCoordinates", latitude: s.mapLat, longitude: s.mapLng },
    openingHoursSpecification: hours
      .filter((h) => !h.closed)
      .map((h) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][h.weekday], opens: minutesToTime(h.openMin), closes: minutesToTime(h.closeMin) })),
  };

  const band = services.length ? services.map((x) => x.name) : ["Solo con cita"];

  return (
    <>
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-brass focus:px-4 focus:py-2 focus:text-ink">
        Saltar al contenido
      </a>
      <ScrollProgress />
      <Header name={s.businessName} />
      <main id="contenido">
        {/* Portada */}
        <section className="relative overflow-hidden">
          <div className="wrap grid items-end gap-10 pb-16 pt-10 md:grid-cols-[1.15fr_0.85fr] md:gap-14 md:pb-24 md:pt-16">
            <div>
              <p className="eyebrow mb-6">Barbería · solo con cita</p>
              <HeroTitle text={s.heroTitle} className="display text-[clamp(2.9rem,8.2vw,6.6rem)]" />
              <Reveal delay={0.45}>
                <p className="mt-7 max-w-xl text-lg text-ash">{s.heroSubtitle}</p>
                <div className="mt-9 flex flex-wrap items-center gap-4">
                  <Link href="/reservar" className="btn btn-primary group">
                    Reservar cita <ArrowRight size={18} aria-hidden className="transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                  <Link href="/#servicios" className="btn btn-ghost">
                    Ver servicios
                  </Link>
                </div>
                <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-5 border-t border-line pt-6">
                  <div>
                    <dt className="eyebrow !text-ash">Próximo hueco libre</dt>
                    <dd className="mt-1 text-lg">
                      {next ? (
                        <Link href="/reservar" className="underline decoration-brass decoration-1 underline-offset-4 hover:text-brass">
                          {nextSlotLabel(next.startsAt)}
                        </Link>
                      ) : (
                        "Agenda completa estas semanas"
                      )}
                    </dd>
                  </div>
                  {s.showRating && s.ratingValue > 0 && (
                    <div>
                      <dt className="eyebrow !text-ash">Valoración</dt>
                      <dd className="mt-1 flex items-center gap-2 text-lg">
                        <Star size={17} className="fill-brass text-brass" aria-hidden />
                        <span className="num">{s.ratingValue.toLocaleString("es-ES", { minimumFractionDigits: 1 })}</span>
                        <span className="text-ash">de 5{s.ratingCount > 0 ? ` · ${s.ratingCount} reseñas` : ""}</span>
                      </dd>
                    </div>
                  )}
                </dl>
              </Reveal>
            </div>
            <div className="relative mx-auto flex w-full max-w-md gap-3 md:max-w-none">
              <div className="pole w-3 shrink-0 rounded-full md:w-4" aria-hidden />
              <ParallaxPhoto src={s.heroImage} alt={`Interior de ${s.businessName}`} priority className="aspect-[4/5] w-full">
                <p className="eyebrow !text-[#c6a15b]">Una persona cada vez</p>
                <p className="font-display mt-1 text-2xl">La silla es tuya todo el servicio.</p>
              </ParallaxPhoto>
            </div>
          </div>
        </section>

        {/* Banda en movimiento con los servicios reales */}
        <div className="brass-band overflow-hidden py-4" aria-hidden>
          <div className="marquee">
            {[0, 1].map((n) => (
              <div key={n} className="flex shrink-0 items-center">
                {[...band, ...band, ...band].map((name, i) => (
                  <span key={i} className="font-display flex items-center whitespace-nowrap text-2xl italic md:text-3xl">
                    <span className="px-6">{name}</span>
                    <span className="h-1.5 w-1.5 rotate-45 bg-[#0c0b0a]" />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Servicios */}
        <section id="servicios" className={`${tone("servicios")} py-20 md:py-28`}>
          <div className="wrap grid gap-10 md:grid-cols-[0.8fr_1.2fr] md:gap-16">
            <Reveal className="md:sticky md:top-28 md:self-start">
              <p className="eyebrow mb-4">Servicios</p>
              <h2 className="display text-4xl md:text-6xl">Lo que hace Carlos</h2>
              <p className="mt-5 max-w-sm text-ash">Elige un servicio para ver las horas libres. El precio depende del corte: Carlos te lo dice allí y se paga en efectivo en la barbería.</p>
            </Reveal>
            <div>
              {services.length === 0 && <p className="text-ash">Carlos está preparando su carta de servicios.</p>}
              <ul className="border-t border-line">
                {services.map((sv, i) => (
                  <li key={sv.id}>
                    <Reveal delay={Math.min(i, 5) * 0.05}>
                      <Link href={`/reservar?servicio=${sv.id}`} className="row-sweep group grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-1 border-b border-line px-1 py-6 transition-colors duration-300 md:px-4">
                        <span className="font-display text-2xl md:text-4xl">{sv.name}</span>
                        <span className="row-muted num flex items-center gap-3 text-sm text-ash transition-colors duration-300">
                          {formatDuration(sv.durationMin)}
                          <ArrowUpRight size={22} aria-hidden className="transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1" />
                        </span>
                        {sv.description && <span className="row-muted col-span-2 text-sm text-ash transition-colors duration-300">{sv.description}</span>}
                      </Link>
                    </Reveal>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Sobre */}
        <section id="sobre" className={`${tone("sobre")} py-20 md:py-28`}>
          <div className="wrap grid items-center gap-10 md:grid-cols-2 md:gap-16">
            <Reveal>
              <ParallaxPhoto src={s.aboutImage} alt="Carlos en la barbería" className="aspect-[4/5] w-full" />
            </Reveal>
            <Reveal delay={0.1}>
              <p className="eyebrow mb-4">Sobre nosotros</p>
              <h2 className="display text-4xl md:text-6xl">{s.aboutTitle}</h2>
              <div className="mt-6 space-y-4 text-lg text-soft">
                {s.aboutText.split(/\n{2,}/).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
              <Link href="/reservar" className="btn btn-ghost mt-8">
                Reservar con Carlos
              </Link>
            </Reveal>
          </div>
        </section>

        {/* Galería */}
        {gallery.length > 0 && (
          <section id="galeria" className={`${tone("galeria")} py-20 md:py-28`}>
            <div className="wrap">
              <Reveal>
                <p className="eyebrow mb-4">Galería</p>
                <h2 className="display max-w-2xl text-4xl md:text-6xl">Cortes que han salido de esta silla</h2>
              </Reveal>
              <div className="mt-12 columns-2 gap-3 md:columns-3 md:gap-4">
                {gallery.map((g, i) => (
                  <Reveal key={g.id} delay={(i % 3) * 0.07} className="mb-3 break-inside-avoid md:mb-4">
                    <figure className="photo group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={g.url} alt={g.alt} loading="lazy" className="w-full" />
                      {g.alt && (
                        <figcaption className="absolute inset-x-0 bottom-0 z-10 translate-y-2 p-4 text-sm text-[#f2eee6] opacity-0 transition duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                          {g.alt}
                        </figcaption>
                      )}
                    </figure>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Reseñas: solo las reales que Carlos añada desde el panel */}
        {reviews.length > 0 && (
          <section id="resenas" className={`${tone("resenas")} py-20 md:py-28`}>
            <div className="wrap">
              <Reveal>
                <p className="eyebrow mb-4">Reseñas</p>
                <h2 className="display text-4xl md:text-6xl">Lo que dicen quienes se han sentado</h2>
              </Reveal>
              <div className="mt-12 grid gap-4 md:grid-cols-3">
                {reviews.map((r, i) => (
                  <Reveal key={r.id} delay={(i % 3) * 0.07}>
                    <figure className="card h-full p-6 transition-transform duration-500 hover:-translate-y-1.5">
                      <div className="mb-4 flex gap-1" aria-label={`${r.rating} de 5 estrellas`}>
                        {Array.from({ length: 5 }).map((_, n) => (
                          <Star key={n} size={15} className={n < r.rating ? "fill-brass text-brass" : "text-line"} aria-hidden />
                        ))}
                      </div>
                      <blockquote className="text-soft">“{r.text}”</blockquote>
                      <figcaption className="mt-5 text-sm text-ash">
                        {r.author} · {r.source}
                      </figcaption>
                    </figure>
                  </Reveal>
                ))}
              </div>
              {s.reviewsUrl && (
                <a href={s.reviewsUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost mt-8">
                  Ver todas las reseñas
                </a>
              )}
            </div>
          </section>
        )}

        {/* Horario */}
        <section id="horario" className={`${tone("horario")} py-20 md:py-28`}>
          <div className="wrap grid gap-10 md:grid-cols-[0.8fr_1.2fr] md:gap-16">
            <Reveal>
              <p className="eyebrow mb-4">Horario</p>
              <h2 className="display text-4xl md:text-6xl">Cuándo está la silla libre</h2>
              <p className="mt-5 max-w-sm text-ash">Carlos atiende solo con cita. El calendario de reservas siempre muestra las horas reales.</p>
            </Reveal>
            <Reveal delay={0.1}>
              <table className="w-full">
                <caption className="sr-only">Horario de apertura</caption>
                <tbody>
                  {WEEK_ORDER.map((wd) => {
                    const h = hours.find((x) => x.weekday === wd);
                    const isToday = wd === todayWd;
                    return (
                      <tr key={wd} className={`border-b border-line transition-colors hover:text-bone ${isToday ? "text-bone" : "text-ash"}`}>
                        <th scope="row" className="py-4 text-left text-lg font-normal">
                          {WEEKDAYS[wd]}
                          {isToday && <span className="eyebrow ml-3">Hoy</span>}
                        </th>
                        <td className="num py-4 text-right">
                          {!h || h.closed
                            ? "Cerrado"
                            : h.breakStartMin != null && h.breakEndMin != null
                              ? `${minutesToTime(h.openMin)}–${minutesToTime(h.breakStartMin)} · ${minutesToTime(h.breakEndMin)}–${minutesToTime(h.closeMin)}`
                              : `${minutesToTime(h.openMin)}–${minutesToTime(h.closeMin)}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {closedDays.length > 0 && (
                <p className="mt-5 text-sm text-ash">
                  Días cerrados próximamente:{" "}
                  {closedDays.map((c) => `${formatLongDate(new Date(`${c.date}T12:00:00Z`))}${c.reason ? ` (${c.reason})` : ""}`).join(" · ")}
                </p>
              )}
            </Reveal>
          </div>
        </section>

        {/* Ubicación */}
        <section id="ubicacion" className={`${tone("ubicacion")} py-20 md:py-28`}>
          <div className="wrap grid gap-10 md:grid-cols-2 md:gap-16">
            <Reveal>
              <p className="eyebrow mb-4">Ubicación y contacto</p>
              <h2 className="display text-4xl md:text-6xl">Dónde encontrarnos</h2>
              <address className="mt-8 space-y-5 not-italic">
                <p className="text-xl">
                  {s.address}
                  <br />
                  {s.postalCity}
                </p>
                <p>
                  <a href={`tel:${s.phone.replace(/\s/g, "")}`} className="num text-xl hover:text-brass">
                    {s.phone}
                  </a>
                  <br />
                  <a href={`mailto:${s.contactEmail}`} className="text-ash hover:text-brass">
                    {s.contactEmail}
                  </a>
                </p>
              </address>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/reservar" className="btn btn-primary">
                  Reservar cita
                </Link>
                {s.whatsapp && (
                  <a href={`https://wa.me/${s.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                    Escribir por WhatsApp
                  </a>
                )}
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <MapEmbed lat={s.mapLat} lng={s.mapLng} label={`${s.address}, ${s.postalCity}`} />
            </Reveal>
          </div>
        </section>

        {/* Cierre */}
        <section className="brass-band py-16 md:py-24">
          <Reveal className="wrap flex flex-wrap items-end justify-between gap-8">
            <h2 className="display max-w-3xl text-5xl md:text-7xl">¿Te guardamos la silla?</h2>
            <Link href="/reservar" className="btn group bg-[#0c0b0a] text-[#f2eee6] hover:bg-[#24211e]">
              Reservar cita <ArrowRight size={18} aria-hidden className="transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </Reveal>
        </section>
      </main>
      <Footer s={s} />
      <StickyCta />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </>
  );
}
