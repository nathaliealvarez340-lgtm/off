import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForms } from "@/components/AuthForms";
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
      <Link href="/" className="brand logo-brand">
        <img src="/logo/logo-off.png" alt="OFF Logo" width={104} height={42} />
      </Link>
      <div className="auth-language"><LanguageSwitcher /></div>
      <div className="auth-editorial-layout">
        <section className="auth-form-column">
          <p className="eyebrow">OFF / Acceso</p>
          <h1>Entrar a OFF</h1>
          <p>Una cuenta para leer, guardar dirección y participar en conversaciones que no se sienten vacías.</p>
          <AuthForms
            next={safeNext}
            initialMessage={passwordReset === "1" ? "Tu contraseña fue actualizada correctamente." : ""}
          />
        </section>
        <aside className="auth-editorial-panel">
          <div>
            <p className="eyebrow">Portafolio privado</p>
            <blockquote>“Todo parece avanzar. Pero algo dentro de ti sigue apagado.”</blockquote>
          </div>
          <div className="auth-editorial-notes">
            <p>OFF no es solo contenido. Es un espacio para reconstruirte.</p>
            <p>Lee, guarda dirección y participa en conversaciones que no se sienten vacías.</p>
          </div>
        </aside>
      </div>
      <GlobalFooter compact />
    </main>
  );
}
