"use client";

import { useState } from "react";
import Image from "next/image";
import { BookOpen, Brain, CalendarClock, Globe2, LogOut, MessageCircle, Sparkles, UserRound } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { logoutAction } from "@/app/actions";
import { LocalDate } from "@/components/LocalDate";
import { MemberActivityTracker } from "@/components/MemberActivityTracker";
import { MemberGreeting } from "@/components/MemberGreeting";
import { PersonalityTestPreview } from "@/components/PersonalityTestPreview";
import { type ArticleTranslationMap, getLocalizedArticle } from "@/lib/article-localization";
import type { UiLanguage } from "@/lib/ui-i18n";
import { MobileReveal, mobileMotion } from "@/mobile/MobileReveal";
import { mobileEase, useMobileCopy } from "@/mobile/mobileCopy";
import heroMobile from "@/mobile/images/hero_mobile.png";
import instagramLogo from "@/mobile/images/social/instagram-logo.png";
import linkedinLogo from "@/mobile/images/social/linkedin-logo.png";
import xLogo from "@/mobile/images/social/x-logo.jpg";

type LoungeArticle = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string;
  category: string;
  publishedAt: string;
  readTime: string;
  translations?: ArticleTranslationMap;
};

type DraftEdition = { id: string; title: string; excerpt: string; date: string; translations?: ArticleTranslationMap };

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

const languageOptions: Array<[UiLanguage, string]> = [
  ["es", "Español"],
  ["en", "English"],
  ["it", "Italiano"],
  ["pt", "Português"],
];

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
  const { copy, language } = useMobileCopy();
  const [languageSheetOpen, setLanguageSheetOpen] = useState(false);
  const localizedArticles = articles.map((article) => ({ ...article, ...getLocalizedArticle(article, language) }));
  const localizedDrafts = draftEditions.map((article) => ({ ...article, ...getLocalizedArticle({ ...article, category: "Borrador", readTime: "" }, language) }));
  const current = localizedArticles[0];
  const libraries = loungeContent.filter((item) => item.type === "LIBRARY");
  const earlyAccess = loungeContent.filter((item) => item.type === "EARLY_ACCESS");

  function selectLanguage(nextLanguage: UiLanguage) {
    window.localStorage.setItem("off-language", nextLanguage);
    document.cookie = `off-language=${nextLanguage}; path=/; max-age=31536000; SameSite=Lax`;
    document.documentElement.lang = nextLanguage;
    window.dispatchEvent(new CustomEvent("off-language-change", { detail: nextLanguage }));
    setLanguageSheetOpen(false);
  }

  return (
    <main className="off-mobile mobile-lounge">
      <MemberActivityTracker />
      <nav className="mobile-topbar mobile-lounge-topbar">
        <Link href="/lounge"><img src="/logo/logo-off.png" alt="OFF" /></Link>
      </nav>

      <motion.header className="mobile-lounge-hero" initial="hidden" animate="visible">
        <motion.div
          className="mobile-lounge-hero-media"
          variants={{
            hidden: { opacity: 0, transform: "scale(1.03)" },
            visible: { opacity: 1, transform: "scale(1)" },
          }}
          transition={{ duration: 0.9, ease: mobileEase }}
        >
          <Image src={heroMobile} alt="" fill priority placeholder="blur" sizes="100vw" />
        </motion.div>
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
          {localizedArticles.map((article) => (
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
          {[...earlyAccess, ...localizedDrafts].map((item) => (
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

      <MobileReveal className="mobile-section" id="conoce-mas">
        <div className="mobile-section-head stacked">
          <h2>{copy.moreTitle}</h2>
          <span>{copy.moreKicker}</span>
        </div>
        <div className="mobile-snap-row compact">
          <a className="mobile-social-pill" href="https://www.instagram.com/off_journal?igsh=MWloaWd4NTFkZWRlcA%3D%3D" target="_blank" rel="noreferrer"><strong><img src={instagramLogo.src} alt="" /></strong><span>OFF OFFICIAL</span></a>
          <a className="mobile-social-pill" href="https://www.linkedin.com/in/nathaliegarciaa/" target="_blank" rel="noreferrer"><strong><img src={linkedinLogo.src} alt="" /></strong><span>LINKEDIN</span></a>
          <a className="mobile-social-pill" href="https://www.instagram.com/nathalie.garciaa" target="_blank" rel="noreferrer"><strong><img src={instagramLogo.src} alt="" /></strong><span>INSTAGRAM</span></a>
          <a className="mobile-social-pill" href="https://x.com/off_journal" target="_blank" rel="noreferrer"><strong><img src={xLogo.src} alt="" /></strong><span>X OFFICIAL</span></a>
        </div>
      </MobileReveal>

      <nav className="mobile-bottom-nav" aria-label="Navegación mobile lounge">
        <a href="#biblioteca"><BookOpen aria-hidden="true" /><span>{copy.library}</span></a>
        <a href="#mi-yo"><Brain aria-hidden="true" /><span>{copy.mySelfKicker}</span></a>
        <a href="#early"><CalendarClock aria-hidden="true" /><span>Early</span></a>
        <a href="#perfil"><UserRound aria-hidden="true" /><span>{copy.profileKicker}</span></a>
        <Link href="/mobile/chat"><MessageCircle aria-hidden="true" /><span>{copy.chatKicker}</span></Link>
        <button type="button" onClick={() => setLanguageSheetOpen(true)} aria-haspopup="dialog" aria-expanded={languageSheetOpen}>
          <Globe2 aria-hidden="true" /><span>{copy.language}</span>
        </button>
        <a href="#conoce-mas"><Sparkles aria-hidden="true" /><span>Más</span></a>
        <form action={logoutAction}><button type="submit"><LogOut aria-hidden="true" /><span>{copy.exit}</span></button></form>
      </nav>

      {languageSheetOpen ? (
        <div className="mobile-language-sheet-backdrop" role="presentation" onClick={() => setLanguageSheetOpen(false)}>
          <motion.div
            className="mobile-language-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={copy.language}
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: mobileEase }}
            onClick={(event) => event.stopPropagation()}
          >
            <span>{copy.language}</span>
            {languageOptions.map(([value, label]) => (
              <button type="button" className={language === value ? "is-active" : ""} onClick={() => selectLanguage(value)} key={value}>
                {label}
              </button>
            ))}
          </motion.div>
        </div>
      ) : null}
    </main>
  );
}
