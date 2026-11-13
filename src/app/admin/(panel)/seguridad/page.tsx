import QRCode from "qrcode";
import { generateURI } from "otplib";
import { requireAdmin } from "@/auth";
import { db } from "@/lib/db";
import { emailConfigured } from "@/lib/email";
import { formatShortDate, timeStrOf } from "@/lib/time";
import { F, Flash, PageTitle, Section } from "@/components/admin/ui";
import { changePasswordAction, confirmTotpAction, disableTotpAction, startTotpAction } from "../../actions";

export const metadata = { title: "Seguridad" };

const ACTIONS: Record<string, string> = {
  login_ok: "Entrada correcta",
  login_failed: "Intento fallido",
  login_blocked: "Acceso bloqueado por demasiados intentos",
  password_changed: "Contraseña cambiada",
  totp_enabled: "Dos pasos activado",
  totp_disabled: "Dos pasos desactivado",
  customer_anonymized: "Datos de un cliente borrados",
};
const EMAIL_STATUS: Record<string, string> = { sent: "Enviado", failed: "Falló", not_configured: "No enviado" };

export default async function Page({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const session = await requireAdmin();
  const sp = await searchParams;
  const [user, audit, emails] = await Promise.all([
    db.adminUser.findUnique({ where: { email: session.user!.email! } }),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 15 }),
    db.emailLog.findMany({ orderBy: { createdAt: "desc" }, take: 15 }),
  ]);
  const pendingSecret = user?.totpSecret && !user.totpEnabled ? user.totpSecret : null;
  const qr = pendingSecret ? await QRCode.toString(generateURI({ issuer: "Barbería Carlos", label: user!.email, secret: pendingSecret }), { type: "svg", margin: 1, color: { dark: "#0c0b0a", light: "#f2eee6" } }) : null;

  return (
    <>
      <PageTitle title="Seguridad" />
      <Flash sp={sp} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Contraseña" intro="Mínimo 12 caracteres. Mejor una frase larga que no uses en ningún otro sitio.">
          <form action={changePasswordAction} className="grid gap-4">
            <F label="Contraseña actual">
              <input type="password" name="current" required autoComplete="current-password" className="field" />
            </F>
            <F label="Contraseña nueva">
              <input type="password" name="next" required minLength={12} autoComplete="new-password" className="field" />
            </F>
            <F label="Repite la contraseña nueva">
              <input type="password" name="repeat" required minLength={12} autoComplete="new-password" className="field" />
            </F>
            <button className="btn btn-primary btn-sm justify-self-start">Cambiar contraseña</button>
          </form>
        </Section>

        <Section title="Verificación en dos pasos" intro="Además de la contraseña, pide un código de tu móvil (Google Authenticator, Aegis, 1Password…). Muy recomendable: el panel guarda datos de tus clientes.">
          {user?.totpEnabled ? (
            <form action={disableTotpAction} className="grid gap-4">
              <p className="text-ok">Activada.</p>
              <F label="Contraseña, para desactivarla">
                <input type="password" name="password" required autoComplete="current-password" className="field" />
              </F>
              <button className="btn btn-danger btn-sm justify-self-start">Desactivar</button>
            </form>
          ) : qr ? (
            <div className="grid gap-5 sm:grid-cols-[11rem_1fr]">
              <div className="h-44 w-44" dangerouslySetInnerHTML={{ __html: qr }} />
              <form action={confirmTotpAction} className="grid content-start gap-4">
                <p className="text-sm text-ash">
                  Escanea el código con tu app. Si no puedes, escribe esta clave: <span className="num break-all text-bone">{pendingSecret}</span>
                </p>
                <F label="Código de 6 cifras">
                  <input name="code" required inputMode="numeric" maxLength={7} autoComplete="one-time-code" className="field num" />
                </F>
                <button className="btn btn-primary btn-sm justify-self-start">Activar</button>
              </form>
            </div>
          ) : (
            <form action={startTotpAction}>
              <button className="btn btn-primary btn-sm">Configurar</button>
            </form>
          )}
        </Section>

        <Section title="Actividad reciente">
          <ul className="text-sm">
            {audit.map((a) => (
              <li key={a.id} className="flex justify-between gap-4 border-b border-line py-2 last:border-0">
                <span className={a.action.includes("failed") || a.action.includes("blocked") ? "text-danger" : ""}>{ACTIONS[a.action] ?? a.action}</span>
                <span className="num text-ash">
                  {formatShortDate(a.createdAt)} {timeStrOf(a.createdAt)} · {a.ip || "—"}
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Emails enviados" intro={emailConfigured() ? undefined : "Resend no está configurado: los emails se anotan aquí pero no salen."}>
          {emails.length === 0 ? (
            <p className="text-sm text-ash">Todavía no hay emails.</p>
          ) : (
            <ul className="text-sm">
              {emails.map((e) => (
                <li key={e.id} className="border-b border-line py-2 last:border-0">
                  <span className={e.status === "sent" ? "text-ok" : e.status === "failed" ? "text-danger" : "text-brass"}>{EMAIL_STATUS[e.status] ?? e.status}</span> · {e.subject}
                  <div className="text-xs text-ash">
                    {e.recipient} · {formatShortDate(e.createdAt)} {timeStrOf(e.createdAt)}
                    {e.error ? ` · ${e.error}` : ""}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </>
  );
}
