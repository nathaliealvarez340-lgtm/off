"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { GlobalFooter } from "@/components/GlobalFooter";
import { GallerySection } from "@/components/GallerySection";
import { LibraryCardDeck } from "@/components/LibraryCardDeck";
import { LoungeBottomNavigation } from "@/components/LoungeBottomNavigation";
import { MemberActivityTracker } from "@/components/MemberActivityTracker";
import { MemberGreeting } from "@/components/MemberGreeting";
import { MemberProfileExperience } from "@/components/MemberProfileExperience";
import { PersonalityTestPreview } from "@/components/PersonalityTestPreview";
import { SocialTile, socialProfiles } from "@/components/SocialLinks";
import { type ArticleTranslationMap, getLocalizedArticle } from "@/lib/article-localization";
import { useOffLanguage } from "@/components/useOffLanguage";
import type { UiLanguage } from "@/lib/ui-i18n";
import type { GalleryPostData } from "@/lib/gallery";
import { mobileCopy } from "@/mobile/mobileCopy";

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
  editionNumber?: number;
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

function cleanText(value: string) {
  return value.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function articleHref(slug: string, language: string, lastPosition = 0) {
  const resume = lastPosition > 0 ? `&resume=${Math.round(lastPosition)}` : "";
  return `/off/${slug}?lang=${language}${resume}`;
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
  galleryPosts,
  galleryHasMore,
  lastReadArticleId,
  lastReadProgress = 0,
  lastReadPosition = 0,
  preferredLanguage = "es",
}: {
  name: string;
  memberSince: string;
  memberNumber: string;
  activeTime: string;
  completedCount: number;
  badges: string[];
  articles: LoungeArticle[];
  loungeContent: LoungeContent[];
  galleryPosts: GalleryPostData[];
  galleryHasMore: boolean;
  draftEditions: DraftEdition[];
  lastReadArticleId?: string | null;
  lastReadProgress?: number;
  lastReadPosition?: number;
  preferredLanguage?: UiLanguage;
}) {
  const [activeSection, setActiveSection] = useState("collections");
  const heroRef = useRef<HTMLElement>(null);
  const nextSectionRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const { language } = useOffLanguage(preferredLanguage);
  const copy = mobileCopy[language];
  const localizedArticles = articles.map((article) => ({ ...article, ...getLocalizedArticle(article, language) }));
  const current = localizedArticles.find((article) => article.id === lastReadArticleId) ?? localizedArticles[0];
  const currentPosition = current?.id === lastReadArticleId ? lastReadPosition : 0;
  const currentProgress = current?.id === lastReadArticleId ? Math.round(lastReadProgress) : 0;
  const libraries = loungeContent.filter((item) => item.type === "LIBRARY");
  const libraryItems = [
    ...localizedArticles.map((article, index) => ({
      id: article.id,
      title: cleanText(article.title),
      number: String(index + 1).padStart(2, "0"),
      description: cleanText(article.excerpt),
      url: articleHref(article.slug, language),
      image: article.coverImage,
      category: article.category,
      date: article.publishedAt,
      readTime: article.readTime,
      cta: "Leer capitulo",
    })),
    ...libraries.map((item, index) => ({
      id: item.id,
      title: cleanText(item.title),
      number: item.number ?? String(localizedArticles.length + index + 1).padStart(2, "0"),
      description: item.description ? cleanText(item.description) : item.content ? cleanText(item.content) : null,
      url: links(item)[0]?.url,
      image: null,
      category: "Biblioteca",
      date: null,
      readTime: null,
      cta: "Abrir volumen",
    })),
  ];

  useEffect(() => {
    const sections = ["collections", "mi-yo", "member-profile", "conoce-mas"]
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

  useEffect(() => {
    if (reducedMotion || window.scrollY > 12) return;

    let timer = window.setTimeout(() => {
      cleanup();
      nextSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 4000);

    const cancel = () => {
      window.clearTimeout(timer);
      cleanup();
    };
    const cleanup = () => {
      window.removeEventListener("wheel", cancel);
      window.removeEventListener("touchstart", cancel);
      window.removeEventListener("keydown", cancel);
      window.removeEventListener("scroll", cancel);
      heroRef.current?.removeEventListener("pointerdown", cancel);
    };

    window.addEventListener("wheel", cancel, { passive: true });
    window.addEventListener("touchstart", cancel, { passive: true });
    window.addEventListener("keydown", cancel);
    window.addEventListener("scroll", cancel, { passive: true });
    heroRef.current?.addEventListener("pointerdown", cancel);

    return () => {
      window.clearTimeout(timer);
      cleanup();
    };
  }, [reducedMotion]);

  return (
    <main className="member-lounge">
      <MemberActivityTracker />
      <motion.header ref={heroRef} className="lounge-hero" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.85 }}>
        <img src="/images/cap2-off.webp" alt="" />
        <div className="lounge-hero-overlay" />
        <div className="lounge-hero-copy">
          <p className="membership-kicker">The Member Lounge</p>
          <h1><MemberGreeting name={name} /></h1>
        </div>
      </motion.header>

      <div className="lounge-after-hero" ref={nextSectionRef}>
        <div className="lounge-content-column">
          <MemberProfileExperience
            memberSince={memberSince}
            memberNumber={memberNumber}
            activeTime={activeTime}
            completedCount={completedCount}
            badges={badges}
            language={language}
            currentReading={current ? {
              title: cleanText(current.title),
              excerpt: cleanText(current.excerpt),
              coverImage: current.coverImage,
              readTime: current.readTime,
              href: articleHref(current.slug, language, currentPosition),
              progress: currentProgress,
            } : null}
          />

          <Reveal className="lounge-section lounge-library-deck-section" id="collections">
            <div className="library-copy-block">
              <span data-i18n="library">Biblioteca</span>
              <h2><span data-i18n="collections">Colecciones</span><em data-i18n="editorial">editoriales</em></h2>
              <p>Volumenes para volver a ideas que merecen mas de una lectura. Una biblioteca emocional, curada para cuando necesitas direccion.</p>
            </div>
            <LibraryCardDeck items={libraryItems} language={language} />
          </Reveal>

          <Reveal className="lounge-section lounge-gallery-wrap">
            <GallerySection initialPosts={galleryPosts} initialHasMore={galleryHasMore} initialLanguage={preferredLanguage} />
          </Reveal>

          <Reveal className="lounge-about-off">
            <div>
              <p className="membership-kicker">Editorial psicologica</p>
              <h2>Que es <em>OFF</em></h2>
              <p>OFF es el espacio donde una generacion que aprendio a rendir puede detenerse, entender lo que esta viviendo y volver a construir con direccion.</p>
              <p>No es motivacion vacia. Es narrativa, reflexion y estrategia para crecer sin perderte a ti mismo.</p>
            </div>
            <figure><img src="/images/off-quees.webp" alt="Imagen editorial sobre que es OFF" /></figure>
          </Reveal>

          <Reveal className="lounge-section lounge-self-section" id="mi-yo">
            <PersonalityTestPreview />
            <div className="self-copy-block">
              <span data-i18n="mySelf">Mi yo</span>
              <h2 data-i18n="knowMyself">Conociendo mi modo ON</h2>
              <p>Una base para convertir la introspeccion en lectura personal. Las preguntas definitivas se conectaran cuando el test este listo.</p>
            </div>
          </Reveal>

          <Reveal className="lounge-more" id="conoce-mas">
            <div>
              <p className="membership-kicker">{copy.behindOff}</p>
              <h2>{copy.moreTitle}</h2>
              <p>{copy.behindOffCopy}</p>
            </div>
            <div className="lounge-social-cards">
              {socialProfiles.map((profile) => <SocialTile profile={profile} key={profile.key} />)}
            </div>
          </Reveal>

          <GlobalFooter compact />
        </div>
      </div>
      <LoungeBottomNavigation
        activeSection={activeSection}
        initialLanguage={preferredLanguage}
        targets={{
          library: "#collections",
          self: "#mi-yo",
          profile: "#member-profile",
          more: "#conoce-mas",
        }}
      />
    </main>
  );
}
