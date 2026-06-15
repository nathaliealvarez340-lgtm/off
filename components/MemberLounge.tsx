"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { logoutAction } from "@/app/actions";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { GlobalFooter } from "@/components/GlobalFooter";
import { LocalDate } from "@/components/LocalDate";
import { MemberGreeting } from "@/components/MemberGreeting";
import { NotaDeNathalie } from "@/components/NotaDeNathalie";

type LoungeArticle = { id: string; title: string; slug: string; excerpt: string; coverImage: string; readTime: string };
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

function cleanText(value: string) {
  return value.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function Reveal({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <motion.section className={className} id={id} initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.58, ease: "easeOut" }}>
      {children}
    </motion.section>
  );
}

export function MemberLounge({
  name,
  memberSince,
  memberNumber,
  articles,
  loungeContent,
  draftEditions,
}: {
  name: string;
  memberSince: string;
  memberNumber: string;
  articles: LoungeArticle[];
  loungeContent: LoungeContent[];
  draftEditions: DraftEdition[];
}) {
  const [activeSection, setActiveSection] = useState("archive");
  const current = articles[0];
  const libraries = loungeContent.filter((item) => item.type === "LIBRARY");
  const signals = loungeContent.filter((item) => item.type === "SIGNAL");
  const resources = loungeContent.filter((item) => item.type === "RESOURCE");
  const notes = loungeContent.filter((item) => item.type === "NATHALIE_NOTE");
  const manualEarlyAccess = loungeContent.filter((item) => item.type === "EARLY_ACCESS");

  useEffect(() => {
    const sections = ["archive", "signals", "exclusives"].map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
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

  function links(item: LoungeContent) {
    return item.links.filter((link): link is { label: string; url: string } => Boolean(link && typeof link === "object" && "label" in link && "url" in link));
  }

  const libraryCollections = Array.from(
    libraries.reduce((collections, item) => {
      const currentCollection = collections.get(item.title) ?? { ...item, links: [] as unknown[] };
      currentCollection.links = [...currentCollection.links, ...item.links];
      if (!currentCollection.description && item.description) currentCollection.description = item.description;
      collections.set(item.title, currentCollection);
      return collections;
    }, new Map<string, LoungeContent>()).values(),
  );

  return (
    <main className="member-lounge">
      <motion.header className="lounge-hero" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.85 }}>
        <img src="/images/cap2-off.webp" alt="" />
        <div className="lounge-hero-overlay" />
        <div className="lounge-hero-copy">
          <p className="membership-kicker">The Member Lounge</p>
          <h1><MemberGreeting name={name} /></h1>
          <div className="currently-exploring">
            <span>Actualmente estás explorando</span>
            <strong>{current ? cleanText(current.title) : "El portafolio OFF"}</strong>
          </div>
          {current ? <Link href={`/off/${current.slug}`}>Continuar leyendo</Link> : null}
        </div>
      </motion.header>

      <div className="lounge-after-hero">
        <nav className="lounge-nav">
          <Link href="/" aria-label="OFF inicio"><img src="/logo/logo-off.png" alt="OFF" /></Link>
          <div>
            <a className={activeSection === "archive" ? "active" : ""} href="#archive">Biblioteca</a>
            <a className={activeSection === "signals" ? "active" : ""} href="#signals">Signals</a>
            <a className={activeSection === "exclusives" ? "active" : ""} href="#exclusives">Recursos</a>
            <LanguageSwitcher compact label="Idioma" />
            <form action={logoutAction}><button type="submit">Cerrar sesión</button></form>
          </div>
        </nav>

        <div className="lounge-content-column">
          <Reveal className="lounge-intro">
            <p>Una sala privada para leer sin prisa, encontrar dirección y volver a ideas que merecen quedarse contigo.</p>
            <dl>
              <div><dt>Miembro desde</dt><dd><LocalDate value={memberSince} /></dd></div>
              <div><dt>Miembro OFF</dt><dd>#{memberNumber}</dd></div>
              <div><dt>Insignia</dt><dd>Founding Member</dd></div>
            </dl>
          </Reveal>

          <Reveal className="lounge-section continue-reading">
            <div className="lounge-heading"><span>En tu mesa</span><h2>Continuar leyendo</h2></div>
            {current ? <Link className="continue-editorial" href={`/off/${current.slug}`}><img src={current.coverImage || "/images/cap1-off.webp"} alt="" /><div><span>{current.readTime}</span><h3>{cleanText(current.title)}</h3><p>{cleanText(current.excerpt)}</p><strong>Volver a la lectura</strong></div></Link> : <p className="lounge-empty">El portafolio se abrirá con la próxima edición.</p>}
          </Reveal>

          <Reveal className="lounge-section archive-section" id="archive">
            <div className="lounge-heading"><span>Colecciones editoriales</span><h2>Biblioteca</h2></div>
            <div className="archive-volumes">
              {libraryCollections.map((item) => <article className="archive-volume" key={item.title}><span>Colección</span><h3>{item.title}</h3><p>{item.description}</p><div className="lounge-linked-resources">{links(item).map((link) => <a href={link.url} key={link.url}>{link.label}</a>)}</div>{links(item)[0] ? <a href={links(item)[0].url}>Abrir volumen</a> : <em>Volumen editorial</em>}</article>)}
              {!libraryCollections.length ? <p className="lounge-empty">La Biblioteca todavía está tomando forma.</p> : null}
            </div>
          </Reveal>

          <Reveal className="lounge-section signals-section" id="signals">
            <div className="lounge-heading"><span>Notas breves</span><h2>Signals</h2></div>
            <div className="signals-list">
              {signals.map((signal, index) => <article className="signal-note" key={signal.id}><span>Signal #{signal.number ?? String(index + 1).padStart(3, "0")}</span><p>{signal.content ?? signal.description}</p></article>)}
              {!signals.length ? <p className="lounge-empty">No hay Signals publicados todavía.</p> : null}
            </div>
          </Reveal>

          {notes.map((note) => <NotaDeNathalie key={note.id}>{note.content ?? note.description ?? note.title}</NotaDeNathalie>)}

          <Reveal className="lounge-section exclusives-section" id="exclusives">
            <div className="lounge-heading"><span>Portafolio privado</span><h2>Recursos desbloqueados</h2></div>
            <div className="exclusive-ledger">
              {resources.map((item, index) => <div key={item.id}><span>{item.number ?? String(index + 1).padStart(2, "0")}</span><strong>{item.title}</strong><p>{item.description}</p><div className="lounge-linked-resources">{links(item).map((link) => <a href={link.url} key={link.url}>{link.label}</a>)}</div></div>)}
              {!resources.length ? <p className="lounge-empty">No hay recursos desbloqueados todavía.</p> : null}
            </div>
          </Reveal>

          <Reveal className="lounge-section early-access">
            <div className="lounge-heading"><span>Early Access</span><h2>Próximamente en OFF</h2></div>
            <div className="early-editions">
              {manualEarlyAccess.map((edition) => <article key={edition.id}><time>{edition.releaseDate ? <LocalDate value={edition.releaseDate} /> : edition.statusLabel}</time><span>{edition.statusLabel}</span><h3>{cleanText(edition.title)}</h3><p>{cleanText(edition.description ?? edition.content ?? "")}</p></article>)}
              {draftEditions.map((edition) => <article key={edition.id}><time><LocalDate value={edition.date} /></time><span>Borrador editorial</span><h3>{cleanText(edition.title)}</h3><p>{cleanText(edition.excerpt)}</p></article>)}
              {!manualEarlyAccess.length && !draftEditions.length ? <p className="lounge-empty">La próxima edición todavía está tomando forma.</p> : null}
            </div>
          </Reveal>

          <Reveal className="member-profile-editorial">
            <div><span>Perfil del miembro</span><h2><MemberGreeting name={name} /></h2><p>Actualmente estás explorando: <strong>{current ? "Reconstruirte" : "The OFF Portfolio"}</strong></p></div>
            <dl><div><dt>Tiempo invertido en OFF</dt><dd>Aún sin registro</dd></div><div><dt>Artículos completados</dt><dd>Aún sin registro</dd></div><div><dt>Insignias</dt><dd>Founding Member · Early Reader</dd></div></dl>
          </Reveal>

          <footer className="lounge-footer"><img src="/logo/logo-off.png" alt="OFF" /><p>No te suscribiste a un newsletter.<br />Entraste a un lugar al que quieres volver.</p></footer>
          <GlobalFooter compact />
        </div>
      </div>
    </main>
  );
}
