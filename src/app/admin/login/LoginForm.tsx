"use client";

import { useActionState } from "react";
import { loginAction } from "../actions";

export function LoginForm() {
  const [error, action, pending] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="space-y-5">
      {error && (
        <p role="alert" className="border border-danger/50 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}
      <label className="block">
        <span className="label">Email</span>
        <input name="email" type="email" autoComplete="username" required className="field" />
      </label>
      <label className="block">
        <span className="label">Contraseña</span>
        <input name="password" type="password" autoComplete="current-password" required className="field" />
      </label>
      <label className="block">
        <span className="label">Código de verificación</span>
        <input name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} className="field num" />
        <span className="hint block">Solo si tienes activada la verificación en dos pasos.</span>
      </label>
      <button className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
