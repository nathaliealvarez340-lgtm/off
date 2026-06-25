"use client";

import { BookOpen, Brain, CalendarClock, Languages, LogOut, Sparkles, UserRound } from "lucide-react";
import Link from "next/link";
import { logoutAction } from "@/app/actions";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { LocalDate } from "@/components/LocalDate";
import { MemberActivityTracker } from "@/components/MemberActivityTracker";
import { MemberGreeting } from "@/components/MemberGreeting";
import { PersonalityTestPreview } from "@/components/PersonalityTestPreview";

type LoungeArticle = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string;
  category: string;
  publishedAt: string;
  readTime: string;
};

type DraftEdition = { id: string; title: string; excerpt: string; date: string };

type LoungeContent = {
  id: string;
  type: "LIBRARY" | "SIGNAL" | "RESOURCE" | "NATHALIE_NOTE" | "EARLY_ACCESS";
  title: string;
  number: string | null;
  description: string | null;
  content: string | null;
  links: unknown[];
  relatedArticle: string | null;
  releaseDate: string | null;
  statusLabel: string | null;
};

export type MobileMemberLoungeProps = {
  name: string;
  memberSince: string;
  memberNumber: string;
  activeTime: string;
  completedCount: number;
  badges: string[];
  articles: LoungeArticle[];
  loungeContent: LoungeContent[];
  draftEditions: DraftEdition[];
};

function clean(value?: string | null) {
  return (value ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

const nav = [
  ["#biblioteca", "Biblioteca", BookOpen],
  ["#mi-yo", "Mi yo", Brain],
  ["#early", "Early", CalendarClock],
  ["#perfil", "Perfil", UserRound],
  ["#conoce-mas", "Más", Sparkles],
] as const;

export function MobileMemberLounge({
  name,
  memberSince,
  memberNumber,
  activeTime,
  completedCount,
  badges,
  articles,
  loungeContent,
  draftEditions,
}: MobileMemberLoungeProps) {
  const current = articles[0];
  const libraries = loungeContent.filter((item) => item.type === "LIBRARY");
  const earlyAccess = loungeContent.filter((item) => item.type === "EARLY_ACCESS");

  return (
    <main className="off-mobile mobile-lounge">
      <MemberActivityTracker />
      <nav className="mobile-topbar">
        <Link href="/lounge"><img src="/logo/logo-off.png" alt="OFF" /></Link>
        <div>
          <LanguageSwitcher compact />
          <form action={logoutAction}><button type="submit">Salir</button></form>
        </div>
      </nav>

      <header className="mobile-lounge-hero">
        <img src="/images/cap2-off.webp" alt="" />
        <div>
          <span>The Member Lounge</span>
          <h1><MemberGreeting name={name} /></h1>
          <p>Una sala privada para leer sin prisa, encontrar dirección y volver a ideas que merecen quedarse contigo.</p>
          {current ? <Link className="mobile-primary" href={`/off/${current.slug}`}>Continuar leyendo</Link> : null}
        </div>
      </header>

      <section className="mobile-member-strip">
        <article><span>Miembro desde</span><strong><LocalDate value={memberSince} /></strong></article>
        <article><span>OFF ID</span><strong>#{memberNumber}</strong></article>
        <article><span>Tiempo</span><strong>{activeTime}</strong></article>
      </section>

      <section className="mobile-section" id="biblioteca">
        <div className="mobile-section-head"><span>Biblioteca</span><h2>Colecciones editoriales</h2></div>
        <div className="mobile-snap-row">
          {articles.map((article) => (
            <Link className="mobile-article-card lounge-card" href={`/off/${article.slug}`} key={article.id}>
              <img src={article.coverImage || "/images/cap1-off.webp"} alt="" />
              <span>{article.category}</span>
              <h3>{clean(article.title)}</h3>
              <p>{clean(article.excerpt)}</p>
              <small>{article.readTime}</small>
            </Link>
          ))}
          {libraries.map((item) => (
            <article className="mobile-article-card lounge-card" key={item.id}>
              <span>Volumen {item.number ?? ""}</span>
              <h3>{clean(item.title)}</h3>
              <p>{clean(item.description ?? item.content)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mobile-section" id="mi-yo">
        <div className="mobile-section-head"><span>Mi yo</span><h2>Me conozco, me reconozco</h2></div>
        <PersonalityTestPreview />
      </section>

      <section className="mobile-section" id="early">
        <div className="mobile-section-head"><span>Early Access</span><h2>Próximamente en OFF</h2></div>
        <div className="mobile-snap-row compact">
          {[...earlyAccess, ...draftEditions].map((item) => (
            <article className="mobile-mini-card" key={item.id}>
              <span>{"releaseDate" in item && item.releaseDate ? <LocalDate value={item.releaseDate} /> : "date" in item ? <LocalDate value={item.date} /> : "OFF"}</span>
              <h3>{clean(item.title)}</h3>
              <p>{clean("description" in item ? item.description ?? item.content : item.excerpt)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mobile-section" id="perfil">
        <div className="mobile-section-head"><span>Perfil</span><h2>Tu recorrido OFF</h2></div>
        <div className="mobile-metric-grid">
          <article><strong>{completedCount || "0"}</strong><span>Artículos completados</span></article>
          <article><strong>{badges.length || "0"}</strong><span>Insignias</span></article>
        </div>
      </section>

      <section className="mobile-section" id="conoce-mas">
        <div className="mobile-section-head"><span>Conoce más</span><h2>Detrás de OFF</h2></div>
        <div className="mobile-snap-row compact">
          <a className="mobile-social-pill" href="https://www.linkedin.com/in/nathaliegarciaa/" target="_blank" rel="noreferrer"><strong>in</strong><span>Nathalie Garcia A.</span></a>
          <a className="mobile-social-pill" href="https://www.instagram.com/nathalie.garciaa" target="_blank" rel="noreferrer"><strong>IG</strong><span>@nathalie.garciaa</span></a>
        </div>
      </section>

      <div className="mobile-language-dock"><Languages aria-hidden="true" /><LanguageSwitcher compact label="Idioma" /></div>

      <nav className="mobile-bottom-nav" aria-label="Navegación mobile lounge">
        {nav.map(([href, label, Icon]) => (
          <a href={href} key={href}><Icon aria-hidden="true" /><span>{label}</span></a>
        ))}
        <form action={logoutAction}><button type="submit"><LogOut aria-hidden="true" /><span>Salir</span></button></form>
      </nav>
    </main>
  );
}
