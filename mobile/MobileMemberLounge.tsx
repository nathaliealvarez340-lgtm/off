"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import Link from "next/link";
import { LibraryMetadata } from "@/components/LibraryCardDeck";
import { LoungeBottomNavigation } from "@/components/LoungeBottomNavigation";
import { MemberActivityTracker } from "@/components/MemberActivityTracker";
import { MemberGreeting } from "@/components/MemberGreeting";
import { MemberProfileExperience } from "@/components/MemberProfileExperience";
import { PersonalityTestPreview } from "@/components/PersonalityTestPreview";
import { SocialPill, socialProfiles } from "@/components/SocialLinks";
import { type ArticleTranslationMap, getLocalizedArticle } from "@/lib/article-localization";
import type { UiLanguage } from "@/lib/ui-i18n";
import { MobileReveal, mobileMotion } from "@/mobile/MobileReveal";
import { mobileEase, useMobileCopy } from "@/mobile/mobileCopy";
import heroMobile from "@/mobile/images/hero_mobile.png";

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
  lastReadArticleId?: string | null;
  lastReadProgress?: number;
  lastReadPosition?: number;
  preferredLanguage?: UiLanguage;
};

function clean(value?: string | null) {
  return (value ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function articleHref(slug: string, language: string, lastPosition = 0) {
  const resume = lastPosition > 0 ? `&resume=${Math.round(lastPosition)}` : "";
  return `/off/${slug}?lang=${language}${resume}`;
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
  lastReadArticleId,
  lastReadProgress = 0,
  lastReadPosition = 0,
  preferredLanguage = "es",
}: MobileMemberLoungeProps) {
  const { copy, language } = useMobileCopy(preferredLanguage);
  const localizedArticles = articles.map((article) => ({ ...article, ...getLocalizedArticle(article, language) }));
  const current = localizedArticles.find((article) => article.id === lastReadArticleId) ?? localizedArticles[0];
  const currentPosition = current?.id === lastReadArticleId ? lastReadPosition : 0;
  const currentProgress = current?.id === lastReadArticleId ? Math.round(lastReadProgress) : 0;
  const libraries = loungeContent.filter((item) => item.type === "LIBRARY");

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
        </motion.div>
      </motion.header>

      <MemberProfileExperience
        memberSince={memberSince}
        memberNumber={memberNumber}
        activeTime={activeTime}
        completedCount={completedCount}
        badges={badges}
        language={language}
        currentReading={current ? {
          title: clean(current.title),
          excerpt: clean(current.excerpt),
          coverImage: current.coverImage,
          readTime: current.readTime,
          href: articleHref(current.slug, language, currentPosition),
          progress: currentProgress,
        } : null}
      />

      <MobileReveal className="mobile-section" id="biblioteca">
        <div className="mobile-section-head stacked">
          <h2>{copy.editorialCollections}</h2>
          <span>{copy.library}</span>
        </div>
        <motion.div className="mobile-snap-row mobile-library-row" variants={mobileMotion.list} initial="hidden" whileInView="visible" viewport={{ amount: 0.16, once: false }}>
          {localizedArticles.map((article) => (
            <motion.div variants={mobileMotion.item} key={article.id}>
              <Link className="mobile-article-card lounge-card" href={articleHref(article.slug, language)}>
                <LibraryMetadata category={article.category} date={article.publishedAt} readTime={article.readTime} language={language} />
                <img src={article.coverImage || "/images/cap1-off.webp"} alt="" loading="lazy" />
                <h3>{clean(article.title)}</h3>
                <p>{clean(article.excerpt)}</p>
              </Link>
            </motion.div>
          ))}
          {libraries.map((item) => (
            <motion.article className="mobile-article-card lounge-card" variants={mobileMotion.item} key={item.id}>
              <span>{copy.volume} {item.number ?? ""}</span>
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

      <MobileReveal className="mobile-section" id="conoce-mas">
        <div className="mobile-section-head stacked">
          <h2>{copy.moreTitle}</h2>
          <span>{copy.behindOff}</span>
        </div>
        <div className="mobile-snap-row compact">
          {socialProfiles.map((profile) => <SocialPill profile={profile} key={profile.key} />)}
        </div>
      </MobileReveal>

      <LoungeBottomNavigation initialLanguage={preferredLanguage} />
    </main>
  );
}
