"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { SubscribeForm } from "@/components/SubscribeForm";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import type { PublicArticle } from "@/components/LocalizedHome";
import { getLocalizedArticle } from "@/lib/article-localization";
import { MobileImpactCarousel } from "@/mobile/MobileImpactCarousel";
import { MobileReveal, mobileMotion } from "@/mobile/MobileReveal";
import { mobileEase, useMobileCopy } from "@/mobile/mobileCopy";
import instagramLogo from "@/mobile/images/social/instagram-logo.png";
import linkedinLogo from "@/mobile/images/social/linkedin-logo.png";
import xLogo from "@/mobile/images/social/x-logo.jpg";

function clean(value: string) {
  return value.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function imageFor(article: PublicArticle, index: number) {
  if (article.coverImage?.startsWith("/")) return article.coverImage;
  return ["/images/cap1-off.webp", "/images/cap2-off.webp", "/images/cap3-off.webp"][index % 3];
}

function articleHref(slug: string, language: string) {
  return `/off/${slug}?lang=${language}`;
}

export function MobileHome({ articles }: { articles: PublicArticle[] }) {
  const { copy, language } = useMobileCopy();
  const localizedArticles = articles.map((article) => ({ ...article, ...getLocalizedArticle(article, language) }));
  const featured = localizedArticles[0];

  return (
    <main className="off-mobile mobile-home">
      <nav className="mobile-topbar" aria-label="OFF mobile">
        <Link href="/" aria-label="OFF inicio"><img src="/logo/logo-off.png" alt="OFF" /></Link>
        <div>
          <LanguageSwitcher compact />
          <Link href="/login">{copy.login}</Link>
        </div>
      </nav>

      <motion.header className="mobile-hero" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.42, ease: mobileEase }}>
        <Image
          className="mobile-hero-image"
          src="/images/hero-off.webp"
          alt=""
          fill
          priority
          sizes="100vw"
        />
        <motion.div variants={mobileMotion.list} initial="hidden" animate="visible">
          <motion.p className="mobile-kicker" variants={mobileMotion.item}>{copy.homeEyebrow}</motion.p>
          <motion.h1 variants={mobileMotion.item}>{copy.heroTitle} <em>{copy.heroEmphasis}</em></motion.h1>
          <motion.p variants={mobileMotion.item}>{copy.heroSubtitle}</motion.p>
          <motion.div variants={mobileMotion.item}>
            <Link className="mobile-primary" href={featured ? articleHref(featured.slug, language) : "/login"}>{copy.enterOff}</Link>
          </motion.div>
        </motion.div>
      </motion.header>

      <MobileReveal className="mobile-section mobile-readings-section">
        <div className="mobile-section-head stacked">
          <h2>{copy.recent}</h2>
          <span>{copy.chapters}</span>
        </div>
        {localizedArticles.length ? (
          <motion.div className="mobile-snap-row mobile-linear-row" aria-label="Artículos recientes" variants={mobileMotion.list} initial="hidden" whileInView="visible" viewport={{ amount: 0.16, once: false }}>
            {localizedArticles.map((article, index) => (
              <motion.div variants={mobileMotion.item} key={article.id}>
                <Link className="mobile-article-card" href={articleHref(article.slug, language)}>
                  <img src={imageFor(article, index)} alt="" loading="lazy" />
                  <span>{article.category}</span>
                  <h3>{clean(article.title)}</h3>
                  <p>{clean(article.excerpt)}</p>
                  <small>{article.readTime}</small>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="mobile-empty-card">
            <span>OFF</span>
            <p>{copy.noArticles}</p>
          </div>
        )}
      </MobileReveal>

      <MobileReveal className="mobile-about-card">
        <img src="/images/off-quees.webp" alt="" loading="lazy" />
        <div>
          <span>OFF</span>
          <h2>{copy.aboutTitle}</h2>
          <p>{copy.aboutCopy}</p>
        </div>
      </MobileReveal>

      <MobileReveal className="mobile-section mobile-impact-section">
        <div className="mobile-section-head">
          <h2>{copy.impact}</h2>
        </div>
        <MobileImpactCarousel
          metrics={[
            { value: 2.3, decimals: 1, suffix: "K+", label: copy.readers },
            { value: 1.8, decimals: 1, suffix: "K+", label: copy.choseSelf },
            { value: 700, suffix: "+", label: copy.stories },
            { value: 2, suffix: "K+", label: copy.rebuilding },
          ]}
        />
      </MobileReveal>

      <MobileReveal className="mobile-section" id="conoce-mas">
        <div className="mobile-section-head stacked">
          <h2>{copy.moreTitle}</h2>
        </div>
        <div className="mobile-snap-row compact">
          <a className="mobile-social-pill" href="https://www.instagram.com/off_journal?igsh=MWloaWd4NTFkZWRlcA%3D%3D" target="_blank" rel="noreferrer">
            <strong><img src={instagramLogo.src} alt="" /></strong><span>@off_journal</span>
          </a>
          <a className="mobile-social-pill" href="https://www.linkedin.com/in/nathaliegarciaa/" target="_blank" rel="noreferrer">
            <strong><img src={linkedinLogo.src} alt="" /></strong><span>Nathalie Garcia A.</span>
          </a>
          <a className="mobile-social-pill" href="https://www.instagram.com/nathalie.garciaa" target="_blank" rel="noreferrer">
            <strong><img src={instagramLogo.src} alt="" /></strong><span>@nathalie.garciaa</span>
          </a>
          <a className="mobile-social-pill" href="https://x.com/off_journal" target="_blank" rel="noreferrer">
            <strong><img src={xLogo.src} alt="" /></strong><span>@off_journal</span>
          </a>
        </div>
      </MobileReveal>

      <MobileReveal className="mobile-subscribe" id="suscripcion">
        <span>{copy.receive}</span>
        <h2>{copy.subscribeTitle}</h2>
        <SubscribeForm />
      </MobileReveal>

      <footer className="mobile-footer">
        <img src="/logo/logo-off.png" alt="OFF" />
        <span>© 2026 OFF. Todos los derechos reservados.</span>
      </footer>
    </main>
  );
}

