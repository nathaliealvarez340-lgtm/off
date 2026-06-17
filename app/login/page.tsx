import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForms } from "@/components/AuthForms";
import { AuthOrbit } from "@/components/AuthOrbit";
import { GlobalFooter } from "@/components/GlobalFooter";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; passwordReset?: string }> }) {
  const user = await getCurrentUser();
  const { next, passwordReset } = await searchParams;
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (user?.role === "ADMIN") redirect("/admin");
  if (user?.role === "USER") redirect(safeNext === "/" ? "/lounge" : safeNext);

  return (
    <main className="auth-page">
      <nav className="auth-navbar" aria-label="Acceso OFF">
        <Link href="/" className="brand logo-brand">
          <img src="/logo/logo-off.png" alt="OFF Logo" width={104} height={42} />
        </Link>
        <div>
          <Link href="/" data-i18n="back">Regresar</Link>
          <Link href="/#conoce-mas" data-i18n="contact">Contacto</Link>
          <LanguageSwitcher compact />
        </div>
      </nav>
      <AuthOrbit />
      <div className="auth-editorial-layout">
        <section className="auth-form-column">
          <p className="eyebrow" data-i18n="loginEyebrow">OFF / Acceso</p>
          <h1 data-i18n="loginTitle">Entrar a OFF</h1>
          <p data-i18n="loginIntro">Una cuenta para leer, guardar direccion y participar en conversaciones que no se sienten vacias.</p>
          <AuthForms
            next={safeNext}
            initialMessage={passwordReset === "1" ? "Tu contrasena fue actualizada correctamente." : ""}
          />
        </section>
      </div>
      <GlobalFooter compact />
    </main>
  );
}
