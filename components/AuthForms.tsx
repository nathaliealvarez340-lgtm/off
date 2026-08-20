"use client";

import { useActionState, useEffect, useId, useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import {
  checkAccessCodeAvailabilityAction,
  generateAvailableAccessCodeAction,
  loginAction,
  registerAction,
  requestPasswordResetAction,
  resendAccessCodeEmailAction,
  type AccessCodeState,
  type PasswordRecoveryState,
  type RegistrationState,
} from "@/app/actions";
import { EmailSplitField } from "@/components/EmailSplitField";
import { PasswordField } from "@/components/PasswordField";
import { useOffLanguage } from "@/components/useOffLanguage";

const initialState = { ok: false, message: "" };
const initialRegistrationState: RegistrationState = { ok: false, message: "", step: "register" };
const initialPasswordRecoveryState: PasswordRecoveryState = { ok: false, message: "" };
const initialAccessCodeState: AccessCodeState = { ok: false, status: "idle", message: "" };

export function AuthForms({ next, initialMessage = "" }: { next: string; initialMessage?: string }) {
  const customCodeStatusId = useId();
  const [mode, setMode] = useState<"login" | "register" | "success" | "forgot">("login");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [transitionMessage, setTransitionMessage] = useState(initialMessage);
  const [accessCodeMode, setAccessCodeMode] = useState<"generated" | "custom">("generated");
  const [accessCode, setAccessCode] = useState("");
  const [accessCodeState, setAccessCodeState] = useState<AccessCodeState>(initialAccessCodeState);
  const [generatingCode, startGeneratingCode] = useTransition();
  const [checkingCode, startCheckingCode] = useTransition();
  const [loginState, login, loginPending] = useActionState(loginAction, initialState);
  const [registerState, register, registerPending] = useActionState(registerAction, initialRegistrationState);
  const [resendAccessState, resendAccessCode, resendAccessPending] = useActionState(resendAccessCodeEmailAction, initialRegistrationState);
  const [recoveryState, requestRecovery, recoveryPending] = useActionState(requestPasswordResetAction, initialPasswordRecoveryState);
  const { language, t } = useOffLanguage();

  useEffect(() => {
    if (registerState.message) setTransitionMessage(registerState.message);
    if (registerState.step === "success" && registerState.email) {
      setVerificationEmail(registerState.email);
      setMode("success");
    }
  }, [registerState]);

  useEffect(() => {
    if (resendAccessState.message) setTransitionMessage(resendAccessState.message);
  }, [resendAccessState]);

  useEffect(() => {
    if (loginState.message) setTransitionMessage(loginState.message);
  }, [loginState]);

  useEffect(() => {
    if (recoveryState.message) setTransitionMessage(recoveryState.message);
  }, [recoveryState]);

  useEffect(() => {
    if (accessCodeMode !== "custom") return;
    if (!/^\d{4}$/.test(accessCode)) {
      setAccessCodeState(accessCode
        ? { ok: false, status: "invalid", message: "Tu código debe tener exactamente 4 dígitos." }
        : initialAccessCodeState);
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(() => {
      startCheckingCode(async () => {
        const result = await checkAccessCodeAvailabilityAction(accessCode);
        if (!cancelled) setAccessCodeState(result);
      });
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [accessCodeMode, accessCode]);

  function generateAccessCode() {
    setAccessCodeMode("generated");
    setAccessCode("");
    setAccessCodeState(initialAccessCodeState);
    startGeneratingCode(async () => {
      const result = await generateAvailableAccessCodeAction();
      setAccessCodeState(result);
      setAccessCode(result.code ?? "");
    });
  }

  function selectCustomAccessCode() {
    setAccessCodeMode("custom");
    setAccessCode("");
    setAccessCodeState(initialAccessCodeState);
    setTransitionMessage("");
  }

  const codeReady = accessCodeState.status === "available" && /^\d{4}$/.test(accessCode);
  const state = mode === "login" ? loginState : mode === "forgot" ? recoveryState : registerState;
  const registerButtonCopy = language === "en"
    ? (registerPending ? "Creating account..." : "Register")
    : language === "it"
      ? (registerPending ? "Creazione account..." : "Registrarmi")
      : language === "pt"
        ? (registerPending ? "Criando conta..." : "Registrar")
        : (registerPending ? "Creando cuenta..." : "Registrarme");

  return (
    <div className="auth-card auth-access-card">
      {mode !== "success" ? (
        <div className="auth-tabs">
          <button className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setTransitionMessage(""); }} type="button">
            {t("loginTab")}
          </button>
          <button className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setTransitionMessage(""); }} type="button">
            {t("registerTab")}
          </button>
        </div>
      ) : null}

      {mode === "login" ? (
        <form action={login} className="editor-form">
          <input name="next" type="hidden" value={next} />
          <EmailSplitField label={t("email")} placeholder="usuario" />
          <PasswordField label="Contraseña o código" name="password" autoComplete="current-password" required />
          <button className="button violet-button" type="submit" disabled={loginPending}>
            {loginPending ? t("entering") : t("enter")}
          </button>
          <button
            className="auth-forgot-link"
            onClick={() => { setMode("forgot"); setTransitionMessage(""); }}
            type="button"
          >
            {t("forgotPassword")}
          </button>
        </form>
      ) : null}

      {mode === "register" ? (
        <form action={register} className="editor-form">
          <input name="preferredLanguage" type="hidden" value={language} />
          <input name="accessCode" type="hidden" value={accessCode} />
          <label className="field">
            {t("name")}
            <input name="name" autoComplete="name" data-i18n-placeholder="namePlaceholder" minLength={2} placeholder={t("namePlaceholder")} required />
          </label>
          <EmailSplitField label={t("email")} placeholder="usuario" />
          <div className="auth-password-row">
            <PasswordField label={t("password")} name="password" autoComplete="new-password" minLength={6} maxLength={8} required />
            <PasswordField label={t("repeatPassword")} name="repeatPassword" autoComplete="new-password" minLength={6} maxLength={8} required />
          </div>
          <div className="access-code-panel">
            <div>
              <strong>Código único de usuario</strong>
              <p>Elige uno aleatorio o crea un código personalizado de 4 dígitos.</p>
            </div>
            <div className="access-code-options">
              <button
                aria-label={accessCodeMode === "generated" && accessCode ? "Generar otro código" : "Generar mi código"}
                className={`access-code-choice generated ${accessCodeMode === "generated" ? "active" : ""}`}
                disabled={generatingCode}
                onClick={generateAccessCode}
                title={accessCode ? "Generar otro código" : undefined}
                type="button"
              >
                <span>{generatingCode ? "••••" : accessCodeMode === "generated" && accessCode ? accessCode : "Generar mi código"}</span>
                {accessCodeMode === "generated" && accessCode ? (
                  <RefreshCw aria-hidden="true" className={generatingCode ? "is-spinning" : ""} size={15} />
                ) : null}
              </button>
              {accessCodeMode === "custom" ? (
                <label className="access-code-choice custom active">
                  <span className="sr-only">Código personalizado</span>
                  <input
                    aria-describedby={customCodeStatusId}
                    aria-label="Código personalizado"
                    autoFocus
                    inputMode="numeric"
                    maxLength={4}
                    onChange={(event) => setAccessCode(event.target.value.replace(/\D/g, "").slice(0, 4))}
                    pattern="[0-9]*"
                    placeholder="_ _ _ _"
                    value={accessCode}
                  />
                </label>
              ) : (
                <button className="access-code-choice" onClick={selectCustomAccessCode} type="button">
                  Código personalizado
                </button>
              )}
            </div>
            <span className={`access-code-status ${accessCodeState.status}`} id={customCodeStatusId} role="status">
              {generatingCode
                ? "Generando código disponible..."
                : checkingCode
                  ? "Comprobando disponibilidad..."
                  : accessCodeState.status === "available"
                    ? "✓ Disponible"
                    : accessCodeState.message}
            </span>
          </div>
          <button className="button violet-button" type="submit" disabled={registerPending || generatingCode || checkingCode || !codeReady}>
            {registerButtonCopy}
          </button>
        </form>
      ) : null}

      {mode === "success" ? (
        <div className="registration-success-panel">
          <p className="eyebrow">OFF / Cuenta creada</p>
          <h2>Tu acceso está listo.</h2>
          <p>{registerState.message}</p>
          <div className="generated-access-code compact">
            <span>Tu código OFF</span>
            <strong>{accessCode}</strong>
            <p>Úsalo junto con tu correo o inicia sesión con tu contraseña.</p>
          </div>
          <button
            className="button violet-button"
            onClick={() => { setMode("login"); setTransitionMessage("Tu cuenta está lista. Ya puedes iniciar sesión."); }}
            type="button"
          >
            Iniciar sesión
          </button>
          <form action={resendAccessCode}>
            <input name="email" type="hidden" value={verificationEmail} />
            <input name="accessCode" type="hidden" value={accessCode} />
            <button className="verification-resend" disabled={resendAccessPending} type="submit">
              {resendAccessPending ? "Reenviando..." : "Reenviar código por correo"}
            </button>
          </form>
        </div>
      ) : null}

      {mode === "forgot" ? (
        <div className="verification-panel">
          <div>
            <p className="eyebrow">{t("recoverAccess")}</p>
            <h2>{t("returnAccess")}</h2>
            <p>{t("recoveryCopy")}</p>
          </div>
          <form action={requestRecovery} className="editor-form">
            <label className="field">
              {t("name")}
              <input name="name" autoComplete="name" data-i18n-placeholder="namePlaceholder" placeholder={t("namePlaceholder")} required />
            </label>
            <EmailSplitField label={t("email")} placeholder="usuario" />
            <button className="button violet-button" disabled={recoveryPending} type="submit">
              {recoveryPending ? t("sending") : "Solicitar acceso"}
            </button>
          </form>
          <button
            className="verification-resend"
            onClick={() => { setMode("login"); setTransitionMessage(""); }}
            type="button"
          >
            {t("backToLogin")}
          </button>
        </div>
      ) : null}

      <div className="status-message" role="status">{transitionMessage || state.message}</div>
    </div>
  );
}
