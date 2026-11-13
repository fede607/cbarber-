"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DateTimePicker, type Picked } from "./DateTimePicker";

export function ManageBooking({ token, serviceId, today, lastDate }: { token: string; serviceId: string; today: string; lastDate: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "move" | "cancel">("idle");
  const [picked, setPicked] = useState<Picked>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function call(method: "PATCH" | "DELETE", body?: unknown) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/bookings/${token}`, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error ?? "No hemos podido hacer el cambio.");
        if (j.code === "SLOT_TAKEN") setPicked(null);
        return;
      }
      setMode("idle");
      setPicked(null);
      router.refresh();
    } catch {
      setError("No hay conexión. Vuelve a intentarlo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8">
      {error && (
        <p role="alert" className="mb-6 border border-danger/50 bg-danger/10 p-4 text-danger">
          {error}
        </p>
      )}
      {mode === "idle" && (
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn btn-primary" onClick={() => setMode("move")}>
            Cambiar día u hora
          </button>
          <button type="button" className="btn btn-danger" onClick={() => setMode("cancel")}>
            Cancelar la cita
          </button>
        </div>
      )}
      {mode === "move" && (
        <div className="card p-5 md:p-8">
          <h2 className="display mb-6 text-3xl">Elige la nueva hora</h2>
          <DateTimePicker serviceId={serviceId} token={token} today={today} lastDate={lastDate} value={picked} onChange={setPicked} />
          <div className="mt-8 flex flex-wrap justify-end gap-3">
            <button type="button" className="btn btn-ghost" onClick={() => setMode("idle")} disabled={busy}>
              Dejarla como está
            </button>
            <button type="button" className="btn btn-primary" disabled={!picked || busy} onClick={() => call("PATCH", picked)}>
              {busy ? "Guardando…" : "Confirmar el cambio"}
            </button>
          </div>
        </div>
      )}
      {mode === "cancel" && (
        <div className="card p-6" role="alertdialog" aria-labelledby="cancel-t">
          <h2 id="cancel-t" className="display text-3xl">
            ¿Cancelar esta cita?
          </h2>
          <p className="mt-3 text-ash">La hora quedará libre para otra persona. Podrás reservar otra cuando quieras.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" className="btn btn-danger" disabled={busy} onClick={() => call("DELETE")}>
              {busy ? "Cancelando…" : "Sí, cancelar la cita"}
            </button>
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setMode("idle")}>
              No, mantenerla
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
