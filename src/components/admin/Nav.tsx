"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Clock, Image as ImageIcon, LayoutDashboard, Scissors, ShieldCheck, Users } from "lucide-react";

const items = [
  ["/admin", "Resumen", LayoutDashboard],
  ["/admin/reservas", "Reservas", CalendarDays],
  ["/admin/clientes", "Clientes", Users],
  ["/admin/servicios", "Servicios", Scissors],
  ["/admin/horarios", "Horarios", Clock],
  ["/admin/contenido", "Contenido", ImageIcon],
  ["/admin/seguridad", "Seguridad", ShieldCheck],
] as const;

export function Nav() {
  const path = usePathname();
  return (
    <nav aria-label="Panel" className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
      {items.map(([href, label, Icon]) => {
        const active = href === "/admin" ? path === href : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 shrink-0 items-center gap-3 border-b-2 px-3 text-sm transition-colors md:border-b-0 md:border-l-2 ${
              active ? "border-brass bg-graphite/50 text-bone" : "border-transparent text-ash hover:text-bone"
            }`}
          >
            <Icon size={17} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
