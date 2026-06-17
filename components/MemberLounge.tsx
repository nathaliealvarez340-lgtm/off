"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { logoutAction } from "@/app/actions";
import { GlobalFooter } from "@/components/GlobalFooter";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { LibraryCardDeck } from "@/components/LibraryCardDeck";
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

const collectionNames = ["Reconstruirte", "Suenos Ajenos", "Direccion", "Identidad", "Ambicion", "Relaciones"];

function cleanText(value: string) {
  return value.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function links(item?: LoungeContent) {
  return (item?.links ?? []).filter((link): link is { label: string; url: string } => Boolean(link && typeof link === "object" && "label" in link && "url" in link));
}

function Reveal({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <motion.section
      className={className}
      id={id}
      initial={{ opacity: 0, transform: "translateY(22px)" }}
      whileInView={{ opacity: 1, transform: "translateY(0)" }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.58, ease: [0.23, 1, 0.32, 1] }}
    >
      {children}
    </motion.section>
  );
}

export function MemberLounge({
  name,
  memberSince,
  memberNumber,
  activeTime,
  completedCount,
  badges,
  articles,
  loungeContent,
  draftEditions,
}: {
  name: string;
  memberSince: string;
  memberNumber: string;
  activeTime: string;
  completedCount: number;
  badges: string[];
  articles: LoungeArticle[];
  loungeContent: LoungeContent[];
  draftEditions: DraftEdition[];
}) {
  const [activeSection, setActiveSection] = useState("collections");
  const current = articles[0];
  const libraries = loungeContent.filter((item) => item.type === "LIBRARY");
  const manualEarlyAccess = loungeContent.filter((item) => item.type === "EARLY_ACCESS");
  const libraryItems = [
    ...articles.map((article, index) => ({
      id: article.id,
      title: cleanText(article.title),
      number: String(index + 1).padStart(2, "0"),
      description: cleanText(article.excerpt),
      url: `/off/${article.slug}`,
      image: article.coverImage,
      category: article.category,
      date: article.publishedAt,
      readTime: article.readTime,
      cta: "Leer capitulo",
    })),
    ...libraries.map((item, index) => ({
      id: item.id,
      title: cleanText(item.title),
      number: item.number ?? String(articles.length + index + 1).padStart(2, "0"),
      description: item.description ? cleanText(item.description) : item.content ? cleanText(item.content) : "Proximamente en la Biblioteca OFF.",
      url: links(item)[0]?.url,
      image: null,
      category: "Biblioteca",
      date: null,
      readTime: null,
      cta: "Abrir volumen",
    })),
  ];

  useEffect(() => {
    const sections = ["collections", "mi-yo", "early-access", "member-profile", "conoce-mas"]
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActiveSection(visible.target.id);
      },
      { rootMargin: "-25% 0px -55% 0px", threshold: [0.05, 0.25, 0.5] },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <main className="member-lounge">
      <MemberActivityTracker />
      <motion.header className="lounge-hero" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.85 }}>
        <img src="/images/cap2-off.webp" alt="" />
        <div className="lounge-hero-overlay" />
        <div className="lounge-hero-copy">
          <p className="membership-kicker">The Member Lounge</p>
          <h1><MemberGreeting name={name} /></h1>
          <div className="currently-exploring">
            <span>Actualmente estas explorando</span>
            <strong>{current ? cleanText(current.title) : "El portafolio OFF"}</strong>
          </div>
          {current ? <Link href={`/off/${current.slug}`}>Continuar leyendo</Link> : null}
        </div>
      </motion.header>

      <div className="lounge-after-hero">
        <nav className="lounge-nav" aria-label="Member Lounge">
          <Link href="/lounge" aria-label="OFF Member Lounge"><img src="/logo/logo-off.png" alt="OFF" /></Link>
          <div>
            <a className={activeSection === "collections" ? "active" : ""} href="#collections">Colecciones</a>
            <a className={activeSection === "mi-yo" ? "active" : ""} href="#mi-yo">Mi yo</a>
            <a className={activeSection === "early-access" ? "active" : ""} href="#early-access">Early Access</a>
            <a className={activeSection === "member-profile" ? "active" : ""} href="#member-profile">Perfil</a>
            <a className={activeSection === "conoce-mas" ? "active" : ""} href="#conoce-mas">Conoce mas</a>
            <LanguageSwitcher compact label="Idioma" />
            <form action={logoutAction}><button type="submit">Cerrar sesion</button></form>
          </div>
        </nav>

        <div className="lounge-content-column">
          <Reveal className="lounge-about-off">
            <div>
              <p className="membership-kicker">Editorial psicologica</p>
              <h2>Que es <em>OFF</em></h2>
              <p>OFF es el espacio donde una generacion que aprendio a rendir puede detenerse, entender lo que esta viviendo y volver a construir con direccion.</p>
              <p>No es motivacion vacia. Es narrativa, reflexion y estrategia para crecer sin perderte a ti mismo.</p>
            </div>
            <figure><img src="/images/off-quees.webp" alt="Imagen editorial sobre que es OFF" /></figure>
          </Reveal>

          <Reveal className="lounge-intro">
            <p>Una sala privada para leer sin prisa, encontrar direccion y volver a ideas que merecen quedarse contigo.</p>
            <dl>
              <div><dt>Miembro desde</dt><dd><LocalDate value={memberSince} /></dd></div>
              <div><dt>Miembro OFF</dt><dd>#{memberNumber}</dd></div>
              <div><dt>Insignia</dt><dd>{badges.at(-1) ?? "Founding Member"}</dd></div>
            </dl>
          </Reveal>

          <Reveal className="lounge-section continue-reading">
            <div className="lounge-heading"><span>En tu mesa</span><h2>Continuar leyendo</h2></div>
            {current ? (
              <Link className="continue-editorial" href={`/off/${current.slug}`}>
                <img src={current.coverImage || "/images/cap1-off.webp"} alt="" />
                <div><span>{current.readTime}</span><h3>{cleanText(current.title)}</h3><p>{cleanText(current.excerpt)}</p><strong>Volver a la lectura</strong></div>
              </Link>
            ) : <p className="lounge-empty">El portafolio se abrira con la proxima edicion.</p>}
          </Reveal>

          <Reveal className="lounge-section lounge-library-deck-section" id="collections">
            <div className="library-copy-block">
              <span data-i18n="library">Biblioteca</span>
              <h2><span data-i18n="collections">Colecciones</span><em data-i18n="editorial">editoriales</em></h2>
              <p>Volumenes para volver a ideas que merecen mas de una lectura. Una biblioteca emocional, curada para cuando necesitas direccion.</p>
            </div>
            <LibraryCardDeck
              items={libraryItems.length ? libraryItems : collectionNames.map((title, index) => ({
                id: title,
                title,
                number: String(index + 1).padStart(2, "0"),
                description: "Proximamente en la Biblioteca OFF.",
                url: undefined,
                image: null,
                category: "Biblioteca",
                date: null,
                readTime: null,
                cta: "Abrir volumen",
              }))}
            />
          </Reveal>

          <Reveal className="lounge-section lounge-self-section" id="mi-yo">
            <PersonalityTestPreview />
            <div className="self-copy-block">
              <span data-i18n="mySelf">Mi yo</span>
              <h2 data-i18n="knowMyself">Me conozco, me reconozco</h2>
              <p>Una base para convertir la introspeccion en lectura personal. Las preguntas definitivas se conectaran cuando el test este listo.</p>
            </div>
          </Reveal>

          <Reveal className="lounge-section early-access" id="early-access">
            <div className="lounge-heading"><span>Early Access</span><h2>Proximamente en OFF</h2></div>
            <div className="early-editions">
              {manualEarlyAccess.map((edition) => <article key={edition.id}><time>{edition.releaseDate ? <LocalDate value={edition.releaseDate} /> : edition.statusLabel}</time><span>{edition.statusLabel}</span><h3>{cleanText(edition.title)}</h3><p>{cleanText(edition.description ?? edition.content ?? "")}</p></article>)}
              {draftEditions.map((edition) => <article key={edition.id}><time><LocalDate value={edition.date} /></time><span>Borrador editorial</span><h3>{cleanText(edition.title)}</h3><p>{cleanText(edition.excerpt)}</p></article>)}
              {!manualEarlyAccess.length && !draftEditions.length ? <p className="lounge-empty">La proxima edicion todavia esta tomando forma.</p> : null}
            </div>
          </Reveal>

          <Reveal className="member-profile-editorial" id="member-profile">
            <div><span>Perfil del miembro</span><h2><MemberGreeting name={name} /></h2><p>Actualmente estas explorando: <strong>{current ? "Reconstruirte" : "The OFF Portfolio"}</strong></p></div>
            <dl>
              <div><dt>Tiempo invertido en OFF</dt><dd>{activeTime}</dd></div>
              <div><dt>Articulos completados</dt><dd>{completedCount || "Aun sin registro"}</dd></div>
              <div><dt>Insignias ganadas</dt><dd>{badges.length ? badges.join(" - ") : "Aun sin insignias"}</dd></div>
            </dl>
          </Reveal>

          <Reveal className="lounge-more" id="conoce-mas">
            <div>
              <p className="membership-kicker">Detras de OFF</p>
              <h2>Conoce <em>mas</em></h2>
              <p>Detras de OFF hay alguien que tambien esta en construccion.</p>
            </div>
            <div className="lounge-social-cards">
              <a href="https://www.linkedin.com/in/nathaliegarciaa/" target="_blank" rel="noreferrer"><span>in</span><strong>LinkedIn</strong><small>NATHALIE GARCIA A.</small></a>
              <a href="https://www.instagram.com/nathalie.garciaa" target="_blank" rel="noreferrer"><span>IG</span><strong>Instagram</strong><small>@nathalie.garciaa</small></a>
              <a href="https://www.instagram.com/off_journal?igsh=MWloaWd4NTFkZWRlcA%3D%3D" target="_blank" rel="noreferrer"><span>IG</span><strong>OFF Journal</strong><small>@off_journal</small></a>
            </div>
          </Reveal>

          <GlobalFooter compact />
        </div>
      </div>
    </main>
  );
}
