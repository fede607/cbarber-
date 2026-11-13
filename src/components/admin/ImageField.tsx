"use client";

import { useRef, useState } from "react";

/** Text field holding an image address, plus a button that uploads a file and fills it in. */
export function ImageField({ name, defaultValue = "", label }: { name: string; defaultValue?: string; label: string }) {
  const [value, setValue] = useState(defaultValue);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const file = useRef<HTMLInputElement>(null);

  async function upload(f: File) {
    setBusy(true);
    setError("");
    const body = new FormData();
    body.append("file", f);
    try {
      const r = await fetch("/api/admin/upload", { method: "POST", body });
      const j = await r.json();
      if (!r.ok) setError(j.error ?? "No se ha podido subir la imagen.");
      else setValue(j.url);
    } catch {
      setError("No se ha podido subir la imagen.");
    } finally {
      setBusy(false);
      if (file.current) file.current.value = "";
    }
  }

  return (
    <div>
      <label className="label" htmlFor={`img-${name}`}>
        {label}
      </label>
      <div className="flex gap-3">
        {value && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-[2.875rem] w-[2.875rem] shrink-0 border border-line object-cover" />
        )}
        <input id={`img-${name}`} name={name} className="field" value={value} onChange={(e) => setValue(e.target.value)} placeholder="https://… o sube un archivo" />
        <button type="button" className="btn btn-ghost btn-sm shrink-0" disabled={busy} onClick={() => file.current?.click()}>
          {busy ? "Subiendo…" : "Subir foto"}
        </button>
        <input ref={file} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" tabIndex={-1} aria-label={`Archivo para ${label}`} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      </div>
      {error ? (
        <p className="mt-2 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : (
        <p className="hint">JPG, PNG, WebP o AVIF, máximo 4 MB.</p>
      )}
    </div>
  );
}
