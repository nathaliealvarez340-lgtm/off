import Link from "next/link";
import { GlobalFooter } from "@/components/GlobalFooter";
import { AuthOrbit } from "@/components/AuthOrbit";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { PasswordResetForm } from "@/components/PasswordResetForm";
import { hashToken } from "@/lib/auth";
import { getDb } from "@/lib/db";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  const resetToken = token
    ? await getDb().passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } })
    : null;
  const isValid = Boolean(
    resetToken &&
      !resetToken.usedAt &&
      resetToken.attempts < 5 &&
      resetToken.expiresAt > new Date(),
  );

  return (
    <main className="auth-page">
      <Link href="/" className="brand logo-brand">
        <img src="/logo/logo-off.png" alt="OFF Logo" width={104} height={42} />
      </Link>
      <div className="auth-language"><LanguageSwitcher /></div>
      <AuthOrbit />
      <div className="auth-editorial-layout">
        <section className="auth-form-column">
          <p className="eyebrow">OFF / Recuperación</p>
          <h1>Nueva contraseña</h1>
          <p>Elige una contraseña de entre 6 y 8 caracteres para volver a entrar.</p>
          <div className="auth-card auth-access-card">
            {isValid ? (
              <PasswordResetForm token={token} />
            ) : (
              <div className="verification-panel">
                <h2>Este enlace ya no está disponible.</h2>
                <p>Puede haber expirado o haber sido utilizado. Solicita uno nuevo desde el login.</p>
                <Link className="button violet-button" href="/login">Volver al login</Link>
              </div>
            )}
          </div>
        </section>
      </div>
      <GlobalFooter compact />
    </main>
  );
}
