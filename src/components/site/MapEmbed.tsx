"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";

/** The map is third-party content: it loads only after the visitor asks for it (no tracking by default). */
export function MapEmbed({ lat, lng, label }: { lat: number; lng: number; label: string }) {
  const [show, setShow] = useState(false);
  const d = 0.004;
  const bbox = [lng - d, lat - d / 1.6, lng + d, lat + d / 1.6].map((n) => n.toFixed(5)).join("%2C");
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat.toFixed(5)}%2C${lng.toFixed(5)}`;
  const link = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden border border-line bg-coal md:aspect-auto md:h-full md:min-h-[26rem]">
      {show ? (
        <iframe title={`Mapa: ${label}`} src={src} className="h-full w-full grayscale-[0.4] invert-[0.92] hue-rotate-180" loading="lazy" referrerPolicy="no-referrer" />
      ) : (
        <div className="grid h-full place-items-center p-6 text-center">
          <div>
            <MapPin className="mx-auto mb-4 text-brass" size={28} aria-hidden />
            <p className="mb-1 font-medium">{label}</p>
            <p className="mx-auto mb-5 max-w-xs text-sm text-ash">El mapa es de OpenStreetMap. Se carga solo si lo pides.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShow(true)}>
                Ver el mapa
              </button>
              <a className="btn btn-ghost btn-sm" href={link} target="_blank" rel="noopener noreferrer">
                Cómo llegar
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
