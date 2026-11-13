import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/auth";
import { Nav } from "@/components/admin/Nav";
import { logoutAction } from "../actions";

export const metadata: Metadata = { title: { default: "Panel", template: "%s · Panel" }, robots: { index: false, follow: false } };

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[14rem_1fr]">
      <aside className="border-b border-line bg-coal md:sticky md:top-0 md:h-dvh md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-4 py-4 md:block md:px-5 md:py-6">
          <Link href="/admin" className="font-display text-2xl italic">
            Panel
          </Link>
          <p className="hidden truncate text-xs text-ash md:mt-1 md:block">{session.user?.email}</p>
          <form action={logoutAction} className="md:hidden">
            <button className="text-sm text-ash hover:text-bone">Salir</button>
          </form>
        </div>
        <Nav />
        <div className="hidden space-y-1 px-5 py-6 text-sm md:block">
          <Link href="/" target="_blank" className="block text-ash hover:text-bone">
            Ver la web ↗
          </Link>
          <form action={logoutAction}>
            <button className="cursor-pointer text-ash hover:text-bone">Cerrar sesión</button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 px-4 py-8 md:px-10 md:py-10">{children}</main>
    </div>
  );
}
