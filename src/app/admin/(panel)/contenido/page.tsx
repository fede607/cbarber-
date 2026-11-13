import { requireAdmin } from "@/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { F, Flash, PageTitle, Section } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { ImageField } from "@/components/admin/ImageField";
import { addGalleryImageAction, addReviewAction, removeGalleryImageAction, removeReviewAction, saveContentAction, toggleReviewAction, updateReviewAction } from "../../actions";

export const metadata = { title: "Contenido" };

export default async function Page({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const [s, gallery, reviews] = await Promise.all([getSettings(), db.galleryImage.findMany({ orderBy: { sortOrder: "asc" } }), db.review.findMany({ orderBy: { createdAt: "desc" } })]);
  return (
    <>
      <PageTitle title="Contenido" intro="Textos, fotos, contacto y reseñas de la web pública." />
      <Flash sp={sp} />

      <form action={saveContentAction}>
        <Section title="Portada">
          <div className="grid gap-4 md:grid-cols-2">
            <F label="Nombre de la barbería">
              <input name="businessName" required maxLength={60} defaultValue={s.businessName} className="field" />
            </F>
            <F label="Titular">
              <input name="heroTitle" required maxLength={90} defaultValue={s.heroTitle} className="field" />
            </F>
            <F label="Texto bajo el titular" className="md:col-span-2">
              <input name="heroSubtitle" maxLength={240} defaultValue={s.heroSubtitle} className="field" />
            </F>
            <div className="md:col-span-2">
              <ImageField name="heroImage" label="Foto de portada" defaultValue={s.heroImage} />
            </div>
          </div>
        </Section>

        <Section title="Sobre nosotros">
          <div className="grid gap-4">
            <F label="Título">
              <input name="aboutTitle" maxLength={90} defaultValue={s.aboutTitle} className="field" />
            </F>
            <F label="Texto" hint="Deja una línea en blanco entre párrafos.">
              <textarea name="aboutText" maxLength={3000} defaultValue={s.aboutText} className="field !min-h-44" />
            </F>
            <ImageField name="aboutImage" label="Foto de Carlos" defaultValue={s.aboutImage} />
          </div>
        </Section>

        <Section title="Contacto y ubicación">
          <div className="grid gap-4 md:grid-cols-2">
            <F label="Dirección">
              <input name="address" maxLength={120} defaultValue={s.address} className="field" />
            </F>
            <F label="Código postal y ciudad">
              <input name="postalCity" maxLength={80} defaultValue={s.postalCity} className="field" />
            </F>
            <F label="Teléfono">
              <input name="phone" maxLength={30} defaultValue={s.phone} className="field" />
            </F>
            <F label="WhatsApp" hint="Con prefijo, por ejemplo +34600123456. Vacío para ocultarlo.">
              <input name="whatsapp" maxLength={30} defaultValue={s.whatsapp} className="field" />
            </F>
            <F label="Email de contacto">
              <input name="contactEmail" type="email" defaultValue={s.contactEmail} className="field" />
            </F>
            <F label="Instagram (dirección completa)">
              <input name="instagram" defaultValue={s.instagram} placeholder="https://instagram.com/…" className="field" />
            </F>
            <F label="TikTok (dirección completa)">
              <input name="tiktok" defaultValue={s.tiktok} placeholder="https://tiktok.com/@…" className="field" />
            </F>
            <div className="grid grid-cols-2 gap-4">
              <F label="Latitud" hint="Para el mapa.">
                <input name="mapLat" inputMode="decimal" defaultValue={s.mapLat} className="field num" />
              </F>
              <F label="Longitud">
                <input name="mapLng" inputMode="decimal" defaultValue={s.mapLng} className="field num" />
              </F>
            </div>
          </div>
        </Section>

        <Section title="Valoración" intro="Pon la nota y el número de reseñas tal como aparecen hoy en tu ficha de Google. Publicar una nota que no es real es publicidad engañosa.">
          <div className="grid gap-4 md:grid-cols-4">
            <F label="Nota (0 a 5)">
              <input name="ratingValue" inputMode="decimal" defaultValue={String(s.ratingValue).replace(".", ",")} className="field num" />
            </F>
            <F label="Número de reseñas" hint="0 para no mostrarlo.">
              <input name="ratingCount" type="number" min={0} defaultValue={s.ratingCount} className="field num" />
            </F>
            <F label="Enlace a tus reseñas" className="md:col-span-2">
              <input name="reviewsUrl" defaultValue={s.reviewsUrl} placeholder="https://g.page/…" className="field" />
            </F>
            <label className="flex items-center gap-3 text-sm md:col-span-4">
              <input type="checkbox" name="showRating" defaultChecked={s.showRating} className="h-5 w-5 accent-[#c6a15b]" />
              Mostrar la valoración en la portada
            </label>
          </div>
        </Section>

        <Section title="Datos legales" intro="Aparecen en el aviso legal y la política de privacidad. Son obligatorios para publicar la web.">
          <div className="grid gap-4 md:grid-cols-3">
            <F label="Titular (nombre y apellidos)">
              <input name="legalOwnerName" maxLength={120} defaultValue={s.legalOwnerName} className="field" />
            </F>
            <F label="NIF">
              <input name="legalOwnerId" maxLength={30} defaultValue={s.legalOwnerId} className="field" />
            </F>
            <F label="Domicilio">
              <input name="legalAddress" maxLength={200} defaultValue={s.legalAddress} className="field" />
            </F>
          </div>
        </Section>

        <div className="sticky bottom-0 -mx-4 mb-10 border-t border-line bg-ink/95 px-4 py-4 backdrop-blur md:-mx-10 md:px-10">
          <button className="btn btn-primary">Guardar contenido</button>
        </div>
      </form>

      <Section id="galeria" title="Galería">
        <form action={addGalleryImageAction} className="grid gap-4 md:grid-cols-[1.4fr_1fr_auto] md:items-end">
          <ImageField name="url" label="Nueva foto" />
          <F label="Descripción de la foto" hint="Para personas que no pueden verla.">
            <input name="alt" maxLength={140} placeholder="Degradado medio con raya" className="field" />
          </F>
          <button className="btn btn-primary btn-sm md:mb-6">Añadir</button>
        </form>
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {gallery.map((g) => (
            <li key={g.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.url} alt={g.alt} className="aspect-square w-full border border-line object-cover" />
              <form action={removeGalleryImageAction} className="mt-2">
                <input type="hidden" name="id" value={g.id} />
                <ConfirmButton message="¿Quitar esta foto de la galería?" className="btn btn-ghost btn-sm w-full">
                  Quitar
                </ConfirmButton>
              </form>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="resenas" title="Reseñas" intro="Copia aquí reseñas reales de tus clientes, tal como las escribieron en Google. Solo las marcadas como publicadas aparecen en la web; si no hay ninguna, la sección no se muestra. Las plantillas de ejemplo están ocultas: sustitúyelas por reseñas reales antes de publicarlas.">
        <form action={addReviewAction} className="grid gap-4 md:grid-cols-4">
          <F label="Autor">
            <input name="author" required maxLength={60} className="field" />
          </F>
          <F label="Estrellas">
            <select name="rating" defaultValue="5" className="field">
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </F>
          <F label="Dónde se publicó" className="md:col-span-2">
            <input name="source" defaultValue="Google" maxLength={30} className="field" />
          </F>
          <F label="Texto de la reseña" className="md:col-span-4">
            <textarea name="text" required maxLength={600} className="field" />
          </F>
          <button className="btn btn-primary btn-sm md:justify-self-start">Añadir reseña</button>
        </form>
        <ul className="mt-6">
          {reviews.map((r) => (
            <li key={r.id} className="border-t border-line py-5">
              <p className={`mb-3 text-xs ${r.visible ? "text-ok" : "text-brass"}`}>{r.visible ? "Publicada en la web" : "Oculta: no aparece en la web"}</p>
              <form action={updateReviewAction} className="grid gap-3 md:grid-cols-4">
                <input type="hidden" name="id" value={r.id} />
                <input name="author" required maxLength={60} defaultValue={r.author} aria-label="Autor" className="field" />
                <select name="rating" defaultValue={String(r.rating)} aria-label="Estrellas" className="field">
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
                <input name="source" maxLength={30} defaultValue={r.source} aria-label="Dónde se publicó" className="field md:col-span-2" />
                <textarea name="text" required maxLength={600} defaultValue={r.text} aria-label="Texto de la reseña" className="field md:col-span-4" />
                <button className="btn btn-ghost btn-sm md:justify-self-start">Guardar</button>
              </form>
              <div className="mt-3 flex gap-2">
                <form action={toggleReviewAction}>
                  <input type="hidden" name="id" value={r.id} />
                  <button className="btn btn-ghost btn-sm">{r.visible ? "Ocultar" : "Publicar en la web"}</button>
                </form>
                <form action={removeReviewAction}>
                  <input type="hidden" name="id" value={r.id} />
                  <ConfirmButton message="¿Eliminar esta reseña?">Eliminar</ConfirmButton>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
