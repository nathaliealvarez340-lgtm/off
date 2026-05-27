"use client";

import { useActionState, useState } from "react";
import { loginAction, registerAction } from "@/app/actions";

const initialState = { ok: false, message: "" };

export function AuthForms({ next }: { next: string }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loginState, login, loginPending] = useActionState(loginAction, initialState);
  const [registerState, register, registerPending] = useActionState(registerAction, initialState);
  const state = mode === "login" ? loginState : registerState;

  return (
    <div className="auth-card">
      <div className="auth-tabs">
        <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")} type="button">
          Iniciar sesión
        </button>
        <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")} type="button">
          Registrarme
        </button>
      </div>

      {mode === "login" ? (
        <form action={login} className="editor-form">
          <input name="next" type="hidden" value={next} />
          <label className="field">
            Correo
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label className="field">
            Contraseña
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <button className="button violet-button" type="submit" disabled={loginPending}>
            {loginPending ? "Entrando..." : "Entrar"}
          </button>
        </form>
      ) : (
        <form action={register} className="editor-form">
          <input name="next" type="hidden" value={next} />
          <label className="field">
            Nombre
            <input name="name" autoComplete="name" required />
          </label>
          <label className="field">
            Correo
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label className="field">
            Contraseña
            <input name="password" type="password" autoComplete="new-password" minLength={8} required />
          </label>
          <button className="button violet-button" type="submit" disabled={registerPending}>
            {registerPending ? "Creando..." : "Crear cuenta"}
          </button>
        </form>
      )}

      <div className="status-message">{state.message}</div>
    </div>
  );
}
