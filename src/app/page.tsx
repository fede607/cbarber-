import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getNextSlot } from "@/lib/availability";
import { WEEKDAYS, WEEK_ORDER, dateStrOf, formatDuration, formatLongDate, formatPrice, minutesToTime, timeStrOf, todayStr, weekdayOf, addDays } from "@/lib/time";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MapEmbed } from "@/components/site/MapEmbed";
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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BarberShop",
    name: s.businessName,
    telephone: s.phone,
    address: { "@type": "PostalAddress", streetAddress: s.address, addressLocality: s.postalCity, addressCountry: "ES" },
    geo: { "@type": "GeoCoordinates", latitude: s.mapLat, longitude: s.mapLng },
    openingHoursSpecification: hours
      .filter((h) => !h.closed)
      .map((h) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][h.weekday], opens: minutesToTime(h.openMin), closes: minutesToTime(h.closeMin) })),
  };

  return (
    <>
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-brass focus:px-4 focus:py-2 focus:text-ink">
        Saltar al contenido
      </a>
      <Header name={s.businessName} />
      <main id="contenido">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="wrap grid items-end gap-10 pb-16 pt-10 md:grid-cols-[1.15fr_0.85fr] md:gap-14 md:pb-24 md:pt-16">
            <div>
              <p className="eyebrow mb-6">Barbería · solo con cita</p>
              <h1 className="display text-[clamp(2.9rem,8.2vw,6.6rem)]">{s.heroTitle}</h1>
              <p className="mt-7 max-w-xl text-lg text-ash">{s.heroSubtitle}</p>
              <div className="mt-9 flex flex-wrap items-center gap-4">
                <Link href="/reservar" className="btn btn-primary">
                  Reservar cita <ArrowRight size={18} aria-hidden />
                </Link>
                <Link href="/#servicios" className="btn btn-ghost">
                  Ver servicios y precios
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
            </div>
            <div className="relative mx-auto flex w-full max-w-md gap-3 md:max-w-none">
              <div className="pole w-3 shrink-0 rounded-full md:w-4" aria-hidden />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.heroImage} alt={`Interior de ${s.businessName}`} className="aspect-[4/5] w-full object-cover" fetchPriority="high" />
            </div>
          </div>
        </section>

        {/* Servicios */}
        <section id="servicios" className="border-t border-line bg-coal py-20 md:py-28">
          <div className="wrap grid gap-10 md:grid-cols-[0.8fr_1.2fr] md:gap-16">
            <Reveal>
              <p className="eyebrow mb-4">Servicios y precios</p>
              <h2 className="display text-4xl md:text-6xl">Lo que hace Carlos, y lo que cuesta</h2>
              <p className="mt-5 max-w-sm text-ash">El precio es cerrado y el tiempo, real. Elige un servicio para ver las horas libres.</p>
            </Reveal>
            <Reveal delay={0.1}>
              {services.length === 0 && <p className="text-ash">Carlos está preparando su carta de servicios.</p>}
              <ul className="border-t border-line">
                {services.map((sv) => (
                  <li key={sv.id}>
                    <Link href={`/reservar?servicio=${sv.id}`} className="group grid grid-cols-[1fr_auto] items-baseline gap-x-6 gap-y-1 border-b border-line py-5 transition-colors hover:bg-graphite/40 md:px-3">
                      <span className="font-display text-2xl transition-colors group-hover:text-brass md:text-3xl">{sv.name}</span>
                      <span className="num text-xl text-brass">{formatPrice(sv.priceCents)}</span>
                      <span className="text-sm text-ash">{sv.description}</span>
                      <span className="num text-right text-sm text-ash">{formatDuration(sv.durationMin)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>

        {/* Sobre */}
        <section id="sobre" className="py-20 md:py-28">
          <div className="wrap grid items-center gap-10 md:grid-cols-2 md:gap-16">
            <Reveal>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.aboutImage} alt="Carlos en la barbería" loading="lazy" className="aspect-[4/5] w-full object-cover" />
            </Reveal>
            <Reveal delay={0.1}>
              <p className="eyebrow mb-4">Sobre nosotros</p>
              <h2 className="display text-4xl md:text-6xl">{s.aboutTitle}</h2>
              <div className="mt-6 space-y-4 text-lg text-[#d5cec2]">
                {s.aboutText.split(/\n{2,}/).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* Galería */}
        {gallery.length > 0 && (
          <section id="galeria" className="border-t border-line bg-coal py-20 md:py-28">
            <div className="wrap">
              <Reveal>
                <p className="eyebrow mb-4">Galería</p>
                <h2 className="display max-w-2xl text-4xl md:text-6xl">Cortes que han salido de esta silla</h2>
              </Reveal>
              <div className="mt-12 columns-2 gap-3 md:columns-3 md:gap-4">
                {gallery.map((g, i) => (
                  <Reveal key={g.id} delay={(i % 3) * 0.07} className="mb-3 break-inside-avoid overflow-hidden md:mb-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={g.url} alt={g.alt} loading="lazy" className="w-full transition-transform duration-700 ease-out hover:scale-[1.04]" />
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Reseñas: only real ones, added by Carlos from the panel */}
        {reviews.length > 0 && (
          <section id="resenas" className="py-20 md:py-28">
            <div className="wrap">
              <Reveal>
                <p className="eyebrow mb-4">Reseñas</p>
                <h2 className="display text-4xl md:text-6xl">Lo que dicen quienes se han sentado</h2>
              </Reveal>
              <div className="mt-12 grid gap-4 md:grid-cols-3">
                {reviews.map((r, i) => (
                  <Reveal key={r.id} delay={(i % 3) * 0.07}>
                    <figure className="card h-full p-6">
                      <div className="mb-4 flex gap-1" aria-label={`${r.rating} de 5 estrellas`}>
                        {Array.from({ length: 5 }).map((_, n) => (
                          <Star key={n} size={15} className={n < r.rating ? "fill-brass text-brass" : "text-line"} aria-hidden />
                        ))}
                      </div>
                      <blockquote className="text-[#d5cec2]">“{r.text}”</blockquote>
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
        <section id="horario" className="border-t border-line bg-coal py-20 md:py-28">
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
                      <tr key={wd} className={`border-b border-line ${isToday ? "text-bone" : "text-ash"}`}>
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
        <section id="ubicacion" className="py-20 md:py-28">
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
      </main>
      <Footer s={s} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </>
  );
}
