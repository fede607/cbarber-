import { isAdmin } from "@/auth";
import { db } from "@/lib/db";

/** RGPD art. 15 y 20: copia de todos los datos de un cliente, para entregársela si la pide. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return new Response("No autorizado", { status: 401 });
  const { id } = await ctx.params;
  const c = await db.customer.findUnique({
    where: { id },
    include: { appointments: { orderBy: { startsAt: "desc" }, select: { serviceName: true, priceCents: true, startsAt: true, endsAt: true, status: true, createdAt: true, notes: true } } },
  });
  if (!c) return new Response("No encontrado", { status: 404 });
  return new Response(JSON.stringify({ exportadoEl: new Date(), cliente: { nombre: c.name, email: c.email, telefono: c.phone, altaEl: c.createdAt, consentimientoEl: c.consentAt }, citas: c.appointments }, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="datos-cliente-${c.id}.json"`, "Cache-Control": "no-store" },
  });
}
