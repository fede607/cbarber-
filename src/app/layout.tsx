import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bodoni-moda/opsz.css";
import "@fontsource-variable/bodoni-moda/opsz-italic.css";
import "@fontsource-variable/instrument-sans/wght.css";
import "@fontsource/dm-mono/latin-400.css";
import "./globals.css";
import { getSettings } from "@/lib/settings";
import { appUrl } from "@/lib/email";

// Every page reads live data (agenda, content) and carries a per-request CSP nonce.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    metadataBase: new URL(appUrl()),
    title: { default: `${s.businessName} · Reserva tu cita`, template: `%s · ${s.businessName}` },
    description: s.heroSubtitle,
    openGraph: { type: "website", locale: "es_ES", title: s.businessName, description: s.heroSubtitle, siteName: s.businessName },
    alternates: { canonical: "/" },
  };
}

export const viewport: Viewport = { themeColor: "#0c0b0a", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
