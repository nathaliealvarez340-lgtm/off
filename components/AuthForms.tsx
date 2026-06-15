"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  loginAction,
  requestPasswordResetAction,
  registerAction,
  resendRegistrationCodeAction,
  verifyRegistrationAction,
  type RegistrationState,
  type PasswordRecoveryState,
} from "@/app/actions";

const initialState = { ok: false, message: "" };
const initialRegistrationState: RegistrationState = { ok: false, message: "", step: "register" };
const initialPasswordRecoveryState: PasswordRecoveryState = { ok: false, message: "" };

export function AuthForms({ next, initialMessage = "" }: { next: string; initialMessage?: string }) {
  const [mode, setMode] = useState<"login" | "register" | "verify" | "forgot">("login");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [transitionMessage, setTransitionMessage] = useState(initialMessage);
  const [digits, setDigits] = useState(["", "", "", ""]);
  const digitRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [loginState, login, loginPending] = useActionState(loginAction, initialState);
  const [registerState, register, registerPending] = useActionState(registerAction, initialRegistrationState);
  const [verifyState, verify, verifyPending] = useActionState(verifyRegistrationAction, initialRegistrationState);
  const [resendState, resend, resendPending] = useActionState(resendRegistrationCodeAction, initialRegistrationState);
  const [recoveryState, requestRecovery, recoveryPending] = useActionState(requestPasswordResetAction, initialPasswordRecoveryState);

  useEffect(() => {
    if (registerState.message) setTransitionMessage(registerState.message);
    if (registerState.step === "verify" && registerState.email) {
      setVerificationEmail(registerState.email);
      setMode("verify");
    }
  }, [registerState]);

  useEffect(() => {
    if (verifyState.message) setTransitionMessage(verifyState.message);
    if (verifyState.step === "login" && verifyState.ok) {
      setMode("login");
      setDigits(["", "", "", ""]);
    } else if (verifyState.step === "register") {
      setMode("register");
    }
  }, [verifyState]);

  useEffect(() => {
    if (resendState.message) setTransitionMessage(resendState.message);
  }, [resendState]);

  useEffect(() => {
    if (loginState.message) setTransitionMessage(loginState.message);
  }, [loginState]);

  useEffect(() => {
    if (recoveryState.message) setTransitionMessage(recoveryState.message);
  }, [recoveryState]);

  const state = mode === "login" ? loginState : mode === "forgot" ? recoveryState : registerState;

  function updateDigit(index: number, value: string) {
    const nextDigit = value.replace(/\D/g, "").slice(-1);
    setDigits((current) => current.map((digit, digitIndex) => (digitIndex === index ? nextDigit : digit)));
    if (nextDigit && index < 3) digitRefs.current[index + 1]?.focus();
  }

  function pasteCode(value: string) {
    const nextDigits = value.replace(/\D/g, "").slice(0, 4).split("");
    if (nextDigits.length === 4) {
      setDigits(nextDigits);
      digitRefs.current[3]?.focus();
    }
  }

  return (
    <div className="auth-card auth-access-card">
      {mode !== "verify" ? (
        <div className="auth-tabs">
          <button className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setTransitionMessage(""); }} type="button">
            Iniciar sesión
          </button>
          <button className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setTransitionMessage(""); }} type="button">
            Registrarme
          </button>
        </div>
      ) : null}

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
          <button
            className="auth-forgot-link"
            onClick={() => { setMode("forgot"); setTransitionMessage(""); }}
            type="button"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </form>
      ) : null}

      {mode === "register" ? (
        <form action={register} className="editor-form">
          <label className="field">
            Nombre
            <input name="name" autoComplete="name" minLength={2} required />
          </label>
          <label className="field">
            Correo
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label className="field">
            Contraseña
            <input name="password" type="password" autoComplete="new-password" minLength={6} maxLength={8} required />
          </label>
          <label className="field">
            Repetir contraseña
            <input name="repeatPassword" type="password" autoComplete="new-password" minLength={6} maxLength={8} required />
          </label>
          <button className="button violet-button" type="submit" disabled={registerPending}>
            {registerPending ? "Enviando código..." : "Continuar"}
          </button>
        </form>
      ) : null}

      {mode === "verify" ? (
        <div className="verification-panel">
          <div>
            <p className="eyebrow">Confirma tu correo</p>
            <h2>Cuatro dígitos para entrar.</h2>
            <p>Enviamos el código a <strong>{verificationEmail}</strong>. Expira en 10 minutos.</p>
          </div>
          <form action={verify} className="verification-form">
            <input name="email" type="hidden" value={verificationEmail} />
            <input name="code" type="hidden" value={digits.join("")} />
            <div className="verification-code" onPaste={(event) => pasteCode(event.clipboardData.getData("text"))}>
              {digits.map((digit, index) => (
                <input
                  aria-label={`Dígito ${index + 1}`}
                  inputMode="numeric"
                  key={index}
                  maxLength={1}
                  onChange={(event) => updateDigit(index, event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Backspace" && !digits[index] && index > 0) digitRefs.current[index - 1]?.focus();
                  }}
                  ref={(element) => { digitRefs.current[index] = element; }}
                  value={digit}
                />
              ))}
            </div>
            <button className="button violet-button" disabled={verifyPending || digits.join("").length !== 4} type="submit">
              {verifyPending ? "Verificando..." : "Finalizar"}
            </button>
          </form>
          <form action={resend}>
            <input name="email" type="hidden" value={verificationEmail} />
            <button className="verification-resend" disabled={resendPending} type="submit">
              {resendPending ? "Reenviando..." : "Reenviar código"}
            </button>
          </form>
        </div>
      ) : null}

      {mode === "forgot" ? (
        <div className="verification-panel">
          <div>
            <p className="eyebrow">Recuperar acceso</p>
            <h2>Volver a entrar.</h2>
            <p>Si los datos coinciden con tu cuenta, te enviaremos un enlace válido durante 30 minutos.</p>
          </div>
          <form action={requestRecovery} className="editor-form">
            <label className="field">
              Nombre
              <input name="name" autoComplete="name" required />
            </label>
            <label className="field">
              Correo
              <input name="email" type="email" autoComplete="email" required />
            </label>
            <button className="button violet-button" disabled={recoveryPending} type="submit">
              {recoveryPending ? "Enviando..." : "Enviar enlace"}
            </button>
          </form>
          <button
            className="verification-resend"
            onClick={() => { setMode("login"); setTransitionMessage(""); }}
            type="button"
          >
            Volver a iniciar sesión
          </button>
        </div>
      ) : null}

      <div className="status-message" role="status">{transitionMessage || state.message}</div>
    </div>
  );
}
