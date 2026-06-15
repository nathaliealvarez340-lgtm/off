"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions";
import { PasswordField } from "@/components/PasswordField";

const initialState = { ok: false, message: "" };

export function AdminLoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialState);

  return (
    <form action={action} className="editor-form">
      <label className="field">
        Correo admin
        <input name="email" type="email" defaultValue="nathaliegarcia@maiabusiness.com" required />
      </label>
      <PasswordField label="Contraseña" name="password" autoComplete="current-password" placeholder="Contraseña" required />
      <button className="button" type="submit" disabled={pending}>
        {pending ? "Entrando..." : "Entrar al panel"}
      </button>
      <div className="status-message">{state.message}</div>
    </form>
  );
}
