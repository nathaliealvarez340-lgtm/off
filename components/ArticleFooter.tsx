import Link from "next/link";
import { SocialTextLinks } from "@/components/SocialLinks";

export function ArticleFooter() {
  return (
    <footer className="article-editorial-footer">
      <div>
        <p className="eyebrow">OFF / Sigue la conversación</p>
        <nav aria-label="Redes de OFF">
          <SocialTextLinks />
        </nav>
      </div>
      <p>© 2026 OFF. Todos los derechos reservados.</p>
      <nav className="article-legal-links" aria-label="Información legal">
        <Link href="/privacidad">Privacidad</Link>
        <Link href="/terminos">Términos</Link>
        <Link href="/contacto">Contacto</Link>
      </nav>
    </footer>
  );
}
