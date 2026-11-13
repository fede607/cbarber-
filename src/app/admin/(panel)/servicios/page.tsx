import { requireAdmin } from "@/auth";
import { db } from "@/lib/db";
import { F, Flash, PageTitle, Section } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { ImageField } from "@/components/admin/ImageField";
import { deleteServiceAction, saveServiceAction } from "../../actions";

export const metadata = { title: "Servicios" };

type S = { id: string; name: string; description: string; priceCents: number; durationMin: number; imageUrl: string; sortOrder: number; active: boolean };

function ServiceForm({ s }: { s?: S }) {
  return (
    <form action={saveServiceAction} className="grid gap-4 md:grid-cols-6">
      {s && <input type="hidden" name="id" value={s.id} />}
      <F label="Nombre" className="md:col-span-3">
        <input name="name" required maxLength={60} defaultValue={s?.name} className="field" />
      </F>
      <F label="Precio (€)" className="md:col-span-1">
        <input name="price" required inputMode="decimal" defaultValue={s ? (s.priceCents / 100).toString().replace(".", ",") : ""} className="field num" />
      </F>
      <F label="Duración (min)" className="md:col-span-1">
        <input name="durationMin" type="number" required min={5} max={480} step={5} defaultValue={s?.durationMin ?? 30} className="field num" />
      </F>
      <F label="Orden" className="md:col-span-1">
        <input name="sortOrder" type="number" min={0} max={999} defaultValue={s?.sortOrder ?? 0} className="field num" />
      </F>
      <F label="Descripción" className="md:col-span-6">
        <input name="description" maxLength={240} defaultValue={s?.description} className="field" />
      </F>
      <div className="md:col-span-6">
        <ImageField name="imageUrl" label="Imagen (opcional)" defaultValue={s?.imageUrl} />
      </div>
      <div className="flex flex-wrap items-center gap-4 md:col-span-6">
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="active" defaultChecked={s?.active ?? true} className="h-5 w-5 accent-[#c6a15b]" />
          Visible y reservable en la web
        </label>
        <button className="btn btn-primary btn-sm ml-auto">{s ? "Guardar" : "Crear servicio"}</button>
      </div>
    </form>
  );
}

export default async function Page({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const services = await db.service.findMany({ where: { deletedAt: null }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  return (
    <>
      <PageTitle title="Servicios" intro="Cambiar el precio o la duración afecta a las reservas nuevas. Las citas ya hechas conservan el precio con el que se reservaron." />
      <Flash sp={sp} />
      <Section title="Nuevo servicio">
        <ServiceForm />
      </Section>
      {services.map((s) => (
        <section key={s.id} className="card mb-4 p-5 md:p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="font-display text-2xl">
              {s.name} {!s.active && <span className="ml-2 align-middle text-xs text-ash">(oculto)</span>}
            </h2>
            <form action={deleteServiceAction}>
              <input type="hidden" name="id" value={s.id} />
              <ConfirmButton message={`¿Eliminar "${s.name}"? Dejará de poder reservarse. Las citas ya hechas no se tocan.`}>Eliminar</ConfirmButton>
            </form>
          </div>
          <ServiceForm s={s} />
        </section>
      ))}
    </>
  );
}
