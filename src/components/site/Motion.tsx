"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { useState } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Thin brass line at the very top that fills as the page is read. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.3 });
  return <motion.div aria-hidden className="fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-[#c6a15b]" style={{ scaleX }} />;
}

/** Headline that rises line by line from behind a mask when the page loads. */
export function HeroTitle({ text, className }: { text: string; className?: string }) {
  const reduce = useReducedMotion();
  const lines = text.match(/[^.!?]+[.!?]*/g)?.map((l) => l.trim()).filter(Boolean) ?? [text];
  return (
    <h1 className={className} aria-label={text}>
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden pb-[0.08em]" aria-hidden>
          <motion.span className="block" initial={reduce ? false : { y: "105%" }} animate={{ y: 0 }} transition={{ duration: 0.95, delay: 0.1 + i * 0.13, ease: EASE }}>
            {line}
          </motion.span>
        </span>
      ))}
    </h1>
  );
}

/** Photo that drifts slower than the page and fades into the section through a gradient. */
export function ParallaxPhoto({ src, alt, className, priority, children }: { src: string; alt: string; className?: string; priority?: boolean; children?: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-7%", "7%"]);
  return (
    <div ref={ref} className={`photo ${className ?? ""}`}>
      { }
      <motion.img src={src} alt={alt} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : undefined} className="absolute inset-0 h-full w-full scale-[1.16] object-cover" style={reduce ? undefined : { y }} />
      {children && <div className="absolute inset-x-0 bottom-0 z-10 p-5 text-[#f2eee6] md:p-7">{children}</div>}
    </div>
  );
}

/** Mobile only: a booking bar that appears once the hero button has scrolled away. */
export function StickyCta() {
  const { scrollY } = useScroll();
  const [show, setShow] = useState(false);
  useMotionValueEvent(scrollY, "change", (v) => setShow(v > 620 && v < document.body.scrollHeight - window.innerHeight - 500));
  return (
    <motion.div
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[#322e29] bg-[#0c0b0a]/95 p-3 backdrop-blur md:hidden"
      initial={false}
      animate={{ y: show ? 0 : "110%" }}
      transition={{ duration: 0.35, ease: EASE }}
      aria-hidden={!show}
    >
      <Link href="/reservar" tabIndex={show ? 0 : -1} className="btn w-full bg-[#c6a15b] text-[#0c0b0a]">
        Reservar cita
      </Link>
    </motion.div>
  );
}
