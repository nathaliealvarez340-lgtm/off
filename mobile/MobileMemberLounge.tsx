"use client";

import { BookOpen, Brain, CalendarClock, Globe2, LogOut, MessageCircle, Sparkles, UserRound } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { logoutAction } from "@/app/actions";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { LocalDate } from "@/components/LocalDate";
import { MemberActivityTracker } from "@/components/MemberActivityTracker";
import { MemberGreeting } from "@/components/MemberGreeting";
import { PersonalityTestPreview } from "@/components/PersonalityTestPreview";
import { MobileReveal, mobileMotion } from "@/mobile/MobileReveal";
import { mobileEase, useMobileCopy } from "@/mobile/mobileCopy";

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
  const { copy } = useMobileCopy();
  const current = articles[0];
  const libraries = loungeContent.filter((item) => item.type === "LIBRARY");
  const earlyAccess = loungeContent.filter((item) => item.type === "EARLY_ACCESS");

  const nav = [
    ["#biblioteca", copy.library, BookOpen],
    ["#mi-yo", copy.mySelfKicker, Brain],
    ["#early", "Early", CalendarClock],
    ["#perfil", copy.profileKicker, UserRound],
    ["#chat", copy.chatKicker, MessageCircle],
    ["#idioma", copy.language, Globe2],
    ["#conoce-mas", "Más", Sparkles],
  ] as const;

  return (
    <main className="off-mobile mobile-lounge">
      <MemberActivityTracker />
      <nav className="mobile-topbar mobile-lounge-topbar">
        <Link href="/lounge"><img src="/logo/logo-off.png" alt="OFF" /></Link>
      </nav>

      <motion.header className="mobile-lounge-hero" initial="hidden" animate="visible">
        <motion.img
          src="/images/cap2-off.webp"
          alt=""
          variants={{
            hidden: { opacity: 0, transform: "scale(1.03)" },
            visible: { opacity: 1, transform: "scale(1)" },
          }}
          transition={{ duration: 0.9, ease: mobileEase }}
        />
        <motion.div variants={mobileMotion.list} transition={{ staggerChildren: 0.12, delayChildren: 0.45 }}>
          <motion.span variants={mobileMotion.item}>{copy.lounge}</motion.span>
          <motion.h1 variants={mobileMotion.item}><MemberGreeting name={name} /></motion.h1>
          <motion.p variants={mobileMotion.item}>{copy.loungeCopy}</motion.p>
          {current ? (
            <motion.div variants={mobileMotion.item}>
              <Link className="mobile-primary" href={`/off/${current.slug}`}>{copy.continueReading}</Link>
            </motion.div>
          ) : null}
        </motion.div>
      </motion.header>

      <MobileReveal className="mobile-member-strip" aria-label="Datos de miembro">
        <article><span>{copy.memberSince}</span><strong><LocalDate value={memberSince} /></strong></article>
        <article><span>OFF ID</span><strong>#{memberNumber}</strong></article>
        <article><span>{copy.timeInvested}</span><strong>{activeTime}</strong></article>
      </MobileReveal>

      <MobileReveal className="mobile-section" id="biblioteca">
        <div className="mobile-section-head stacked">
          <h2>{copy.editorialCollections}</h2>
          <span>{copy.library}</span>
        </div>
        <motion.div className="mobile-snap-row mobile-library-row" variants={mobileMotion.list} initial="hidden" whileInView="visible" viewport={{ amount: 0.16, once: false }}>
          {articles.map((article) => (
            <motion.div variants={mobileMotion.item} key={article.id}>
              <Link className="mobile-article-card lounge-card" href={`/off/${article.slug}`}>
                <img src={article.coverImage || "/images/cap1-off.webp"} alt="" loading="lazy" />
                <span>{article.category}</span>
                <h3>{clean(article.title)}</h3>
                <p>{clean(article.excerpt)}</p>
                <small>{article.readTime}</small>
              </Link>
            </motion.div>
          ))}
          {libraries.map((item) => (
            <motion.article className="mobile-article-card lounge-card" variants={mobileMotion.item} key={item.id}>
              <span>Volumen {item.number ?? ""}</span>
              <h3>{clean(item.title)}</h3>
              <p>{clean(item.description ?? item.content)}</p>
            </motion.article>
          ))}
        </motion.div>
      </MobileReveal>

      <MobileReveal className="mobile-section mobile-self-section" id="mi-yo">
        <div className="mobile-section-head stacked">
          <h2>{copy.mySelfTitle}</h2>
          <span>{copy.mySelfKicker}</span>
        </div>
        <PersonalityTestPreview />
      </MobileReveal>

      <MobileReveal className="mobile-section" id="early">
        <div className="mobile-section-head stacked">
          <h2>{copy.earlyTitle}</h2>
          <span>{copy.earlyKicker}</span>
        </div>
        <div className="mobile-snap-row compact">
          {[...earlyAccess, ...draftEditions].map((item) => (
            <article className="mobile-mini-card" key={item.id}>
              <span>{"releaseDate" in item && item.releaseDate ? <LocalDate value={item.releaseDate} /> : "date" in item ? <LocalDate value={item.date} /> : "OFF"}</span>
              <h3>{clean(item.title)}</h3>
              <p>{clean("description" in item ? item.description ?? item.content : item.excerpt)}</p>
            </article>
          ))}
        </div>
      </MobileReveal>

      <MobileReveal className="mobile-section" id="perfil">
        <div className="mobile-section-head stacked">
          <h2>{copy.profileTitle}</h2>
          <span>{copy.profileKicker}</span>
        </div>
        <div className="mobile-metric-grid">
          <article><strong>{completedCount || "0"}</strong><span>{copy.articlesCompleted}</span></article>
          <article><strong>{badges.length || "0"}</strong><span>{copy.badges}</span></article>
        </div>
      </MobileReveal>

      <MobileReveal className="mobile-section" id="chat">
        <div className="mobile-section-head stacked">
          <h2>{copy.chatTitle}</h2>
          <span>{copy.chatKicker}</span>
        </div>
        <div className="mobile-empty-card">
          <span>OFF</span>
          <p>Comparte una tensión, una pregunta o una idea desde los capítulos publicados.</p>
        </div>
      </MobileReveal>

      <MobileReveal className="mobile-section" id="idioma">
        <div className="mobile-section-head stacked">
          <h2>{copy.language}</h2>
          <span>OFF</span>
        </div>
        <div className="mobile-language-card">
          <Globe2 aria-hidden="true" />
          <LanguageSwitcher compact label={copy.language} />
        </div>
      </MobileReveal>

      <MobileReveal className="mobile-section" id="conoce-mas">
        <div className="mobile-section-head stacked">
          <h2>{copy.moreTitle}</h2>
          <span>{copy.moreKicker}</span>
        </div>
        <div className="mobile-snap-row compact">
          <a className="mobile-social-pill" href="https://www.linkedin.com/in/nathaliegarciaa/" target="_blank" rel="noreferrer"><strong><img src="/logo/linkedin-logo.svg" alt="" /></strong><span>Nathalie Garcia A.</span></a>
          <a className="mobile-social-pill" href="https://www.instagram.com/nathalie.garciaa" target="_blank" rel="noreferrer"><strong><img src="/logo/instagram-logo.svg" alt="" /></strong><span>@nathalie.garciaa</span></a>
        </div>
      </MobileReveal>

      <nav className="mobile-bottom-nav" aria-label="Navegación mobile lounge">
        {nav.map(([href, label, Icon]) => (
          <a href={href} key={href}><Icon aria-hidden="true" /><span>{label}</span></a>
        ))}
        <form action={logoutAction}><button type="submit"><LogOut aria-hidden="true" /><span>{copy.exit}</span></button></form>
      </nav>
    </main>
  );
}
