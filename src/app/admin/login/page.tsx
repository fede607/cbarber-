import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Acceso", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <main className="grid min-h-dvh place-items-center px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="pole pole-static mb-8 h-1.5" aria-hidden />
        <h1 className="font-display mb-2 text-4xl">Panel de Carlos</h1>
        <p className="mb-8 text-sm text-ash">Acceso privado. Los intentos de entrada quedan registrados.</p>
        <LoginForm />
        <Link href="/" className="mt-8 inline-block text-sm text-ash hover:text-bone">
          ← Volver a la web
        </Link>
      </div>
    </main>
  );
}
