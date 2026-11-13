"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

const links = [
  ["Servicios", "/#servicios"],
  ["Sobre Carlos", "/#sobre"],
  ["Galería", "/#galeria"],
  ["Horario", "/#horario"],
  ["Dónde estamos", "/#ubicacion"],
] as const;

export function Header({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-colors duration-300 ${scrolled || open ? "border-line bg-ink/95 backdrop-blur" : "border-transparent bg-ink"}`}
    >
      <div className="wrap flex h-16 items-center justify-between gap-6">
        <Link href="/" className="font-display text-2xl italic leading-none tracking-tight" onClick={() => setOpen(false)}>
          {name}
        </Link>
        <nav aria-label="Principal" className="hidden items-center gap-7 lg:flex">
          {links.map(([label, href]) => (
            <Link key={href} href={href} className="text-sm text-ash transition-colors hover:text-bone">
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/reservar" className="btn btn-primary btn-sm">
            Reservar cita
          </Link>
          <button
            type="button"
            className="grid h-11 w-11 place-items-center lg:hidden"
            aria-expanded={open}
            aria-controls="menu-movil"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
      {open && (
        <nav id="menu-movil" aria-label="Principal" className="wrap flex h-[calc(100dvh-4rem)] flex-col gap-1 overflow-y-auto border-t border-line pt-4 lg:hidden">
          {links.map(([label, href]) => (
            <Link key={href} href={href} onClick={() => setOpen(false)} className="font-display border-b border-line py-4 text-3xl">
              {label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
