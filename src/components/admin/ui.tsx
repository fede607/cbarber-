import Link from "next/link";

export function Flash({ sp }: { sp: { ok?: string; error?: string } }) {
  if (sp.error)
    return (
      <p role="alert" className="mb-6 border border-danger/50 bg-danger/10 px-4 py-3 text-danger">
        {sp.error}
      </p>
    );
  if (sp.ok)
    return (
      <p role="status" className="mb-6 border border-ok/40 bg-ok/10 px-4 py-3 text-ok">
        {sp.ok}
      </p>
    );
  return null;
}

export function PageTitle({ title, children, intro }: { title: string; intro?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-4xl">{title}</h1>
        {intro && <p className="mt-1 max-w-2xl text-sm text-ash">{intro}</p>}
      </div>
      {children}
    </div>
  );
}

export function Section({ title, intro, id, children }: { title: string; intro?: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="card mb-6 scroll-mt-24 p-5 md:p-6">
      <h2 className="font-display text-2xl">{title}</h2>
      {intro && <p className="mt-1 max-w-2xl text-sm text-ash">{intro}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function F({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="hint block">{hint}</span>}
    </label>
  );
}

const STATUS = {
  PENDING: ["Pendiente", "border-brass/60 text-brass"],
  COMPLETED: ["Completada", "border-ok/50 text-ok"],
  CANCELLED: ["Cancelada", "border-danger/50 text-danger"],
  NO_SHOW: ["No presentada", "border-line text-ash"],
} as const;

export function StatusBadge({ status }: { status: keyof typeof STATUS }) {
  const [label, cls] = STATUS[status];
  return <span className={`inline-block whitespace-nowrap border px-2 py-0.5 text-xs ${cls}`}>{label}</span>;
}

export function Empty({ children, href, cta }: { children: React.ReactNode; href?: string; cta?: string }) {
  return (
    <div className="card p-10 text-center text-ash">
      <p>{children}</p>
      {href && cta && (
        <Link href={href} className="btn btn-primary btn-sm mt-5">
          {cta}
        </Link>
      )}
    </div>
  );
}
