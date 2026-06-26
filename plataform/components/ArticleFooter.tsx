const socialLinks = [
  ["Instagram", "https://www.instagram.com/off_journal?igsh=MWloaWd4NTFkZWRlcA%3D%3D"],
  ["LinkedIn", "https://www.linkedin.com/in/nathaliegarciaa/"],
  ["Substack", "https://substack.com/@nathalieegarcia?r=7mwiko&utm_campaign=profile&utm_medium=profile-page"],
];

export function ArticleFooter() {
  return (
    <footer className="article-editorial-footer">
      <div>
        <p className="eyebrow">OFF / Sigue la conversación</p>
        <nav aria-label="Redes de OFF">
          {socialLinks.map(([label, href]) => <a href={href} target="_blank" rel="noreferrer" key={label}>{label}</a>)}
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
import Link from "next/link";
