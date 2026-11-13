import Link from "next/link";
import type { Settings } from "@/lib/settings";

export function Footer({ s }: { s: Settings }) {
  const social = [
    ["Instagram", s.instagram],
    ["TikTok", s.tiktok],
    ["WhatsApp", s.whatsapp ? `https://wa.me/${s.whatsapp.replace(/\D/g, "")}` : ""],
    ["Reseñas", s.reviewsUrl],
  ].filter(([, url]) => url);

  return (
    <footer className="border-t border-line bg-ink">
      <div className="pole pole-static h-1.5" aria-hidden />
      <div className="wrap grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-display text-4xl italic">{s.businessName}</p>
          <p className="mt-3 max-w-xs text-sm text-ash">
            {s.address}, {s.postalCity}
            <br />
            <a href={`tel:${s.phone.replace(/\s/g, "")}`} className="hover:text-bone">
              {s.phone}
            </a>
          </p>
        </div>
        <nav aria-label="Redes sociales">
          <p className="eyebrow mb-3">Síguenos</p>
          {social.length === 0 && <p className="text-sm text-ash">Próximamente.</p>}
          <ul className="space-y-2 text-sm">
            {social.map(([label, url]) => (
              <li key={label}>
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-ash hover:text-brass">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Legal">
          <p className="eyebrow mb-3">Legal</p>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/privacidad" className="text-ash hover:text-brass">
                Política de privacidad
              </Link>
            </li>
            <li>
              <Link href="/aviso-legal" className="text-ash hover:text-brass">
                Aviso legal
              </Link>
            </li>
            <li>
              <Link href="/privacidad#cookies" className="text-ash hover:text-brass">
                Cookies
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="wrap flex flex-wrap justify-between gap-2 border-t border-line py-5 text-xs text-ash">
        <p>
          © {new Date().getFullYear()} {s.businessName}
        </p>
        <Link href="/admin" className="hover:text-bone">
          Acceso de Carlos
        </Link>
      </div>
    </footer>
  );
}
