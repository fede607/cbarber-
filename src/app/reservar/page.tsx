import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { addDays, formatDuration, formatPrice, todayStr } from "@/lib/time";
import { Shell } from "@/components/site/Shell";
import { BookingFlow } from "@/components/booking/BookingFlow";

export const metadata: Metadata = { title: "Reservar cita", alternates: { canonical: "/reservar" } };

export default async function Page({ searchParams }: { searchParams: Promise<{ servicio?: string }> }) {
  const [{ servicio }, s, services] = await Promise.all([
    searchParams,
    getSettings(),
    db.service.findMany({ where: { active: true, deletedAt: null }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  ]);
  const today = todayStr();
  return (
    <Shell>
      <p className="eyebrow mb-4">Reserva online</p>
      <h1 className="display mb-10 text-5xl md:text-7xl">Reserva tu cita</h1>
      <BookingFlow
        services={services.map((x) => ({ id: x.id, name: x.name, description: x.description, priceLabel: formatPrice(x.priceCents), durationLabel: formatDuration(x.durationMin) }))}
        initialServiceId={services.some((x) => x.id === servicio) ? servicio : undefined}
        today={today}
        lastDate={addDays(today, s.maxAdvanceDays)}
      />
    </Shell>
  );
}
