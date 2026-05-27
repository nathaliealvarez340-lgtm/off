"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions";

const initialState = { ok: false, message: "" };

export function AdminLoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialState);

  return (
    <form action={action} className="editor-form">
      <label className="field">
        Correo admin
        <input name="email" type="email" defaultValue="nathalie@example.com" required />
      </label>
      <label className="field">
        Contraseña
        <input name="password" type="password" placeholder="Contraseña" required />
      </label>
      <button className="button" type="submit" disabled={pending}>
        {pending ? "Entrando..." : "Entrar al panel"}
      </button>
      <div className="status-message">{state.message}</div>
    </form>
  );
}
