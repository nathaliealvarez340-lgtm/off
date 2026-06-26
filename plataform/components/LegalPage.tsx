import Link from "next/link";
import { GlobalFooter } from "@/components/GlobalFooter";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export function LegalPage({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <main className="legal-page">
      <nav className="legal-nav">
        <Link href="/"><img src="/logo/logo-off.png" alt="OFF" /></Link>
        <LanguageSwitcher compact />
      </nav>
      <article className="legal-document">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {children}
      </article>
      <GlobalFooter compact />
    </main>
  );
}
