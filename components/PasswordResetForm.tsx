"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { resetPasswordAction, type PasswordRecoveryState } from "@/app/actions";
import { PasswordField } from "@/components/PasswordField";

const initialState: PasswordRecoveryState = { ok: false, message: "" };

export function PasswordResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(resetPasswordAction, initialState);

  useEffect(() => {
    if (!state.ok) return;

    const timeout = window.setTimeout(() => {
      router.replace("/login?passwordReset=1");
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [router, state.ok]);

  return (
    <form action={action} className="editor-form">
      <input name="token" type="hidden" value={token} />
      <PasswordField label="Nueva contraseña" name="password" autoComplete="new-password" minLength={6} maxLength={8} required />
      <PasswordField label="Repetir nueva contraseña" name="repeatPassword" autoComplete="new-password" minLength={6} maxLength={8} required />
      <button className="button violet-button" disabled={pending || state.ok} type="submit">
        {pending ? "Actualizando..." : "Actualizar contraseña"}
      </button>
      <div className="status-message" role="status">{state.message}</div>
    </form>
  );
}
