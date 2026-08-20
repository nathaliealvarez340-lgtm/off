import Link from "next/link";
import { SocialTextLinks } from "@/components/SocialLinks";

export function GlobalFooter({ compact = false }: { compact?: boolean }) {
  return (
    <footer className={`global-off-footer ${compact ? "compact" : ""}`}>
      <Link href="/" aria-label="OFF inicio"><img src="/logo/logo-off.png" alt="OFF" /></Link>
      <nav aria-label="Información legal">
        <Link href="/privacidad">Privacidad</Link>
        <Link href="/terminos">Términos</Link>
        <Link href="/contacto">Contacto</Link>
      </nav>
      <nav aria-label="Redes de OFF">
        <SocialTextLinks />
      </nav>
      <p>© 2026 OFF. Todos los derechos reservados.</p>
    </footer>
  );
}
