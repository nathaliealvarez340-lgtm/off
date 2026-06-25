"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { SubscribeForm } from "@/components/SubscribeForm";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import type { PublicArticle } from "@/components/LocalizedHome";
import { MobileCountUp } from "@/mobile/MobileCountUp";
import { MobileReveal, mobileMotion } from "@/mobile/MobileReveal";
import { mobileEase, useMobileCopy } from "@/mobile/mobileCopy";
import portadaMobile from "@/mobile/images/portada_mobile.png";

function clean(value: string) {
  return value.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function imageFor(article: PublicArticle, index: number) {
  if (article.coverImage?.startsWith("/")) return article.coverImage;
  return ["/images/cap1-off.webp", "/images/cap2-off.webp", "/images/cap3-off.webp"][index % 3];
}

export function MobileHome({ articles }: { articles: PublicArticle[] }) {
  const featured = articles[0];
  const { copy } = useMobileCopy();

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
          src={portadaMobile}
          alt=""
          fill
          priority
          placeholder="blur"
          sizes="100vw"
        />
        <motion.div variants={mobileMotion.list} initial="hidden" animate="visible">
          <motion.p className="mobile-kicker" variants={mobileMotion.item}>{copy.homeEyebrow}</motion.p>
          <motion.h1 variants={mobileMotion.item}>{copy.heroTitle} <em>{copy.heroEmphasis}</em></motion.h1>
          <motion.p variants={mobileMotion.item}>{copy.heroSubtitle}</motion.p>
          <motion.div variants={mobileMotion.item}>
            <Link className="mobile-primary" href={featured ? `/off/${featured.slug}` : "/login"}>{copy.enterOff}</Link>
          </motion.div>
        </motion.div>
      </motion.header>

      <MobileReveal className="mobile-section mobile-readings-section">
        <div className="mobile-section-head stacked">
          <h2>{copy.recent}</h2>
          <span>{copy.chapters}</span>
        </div>
        {articles.length ? (
          <motion.div className="mobile-snap-row mobile-linear-row" aria-label="Artículos recientes" variants={mobileMotion.list} initial="hidden" whileInView="visible" viewport={{ amount: 0.16, once: false }}>
            {articles.map((article, index) => (
              <motion.div variants={mobileMotion.item} key={article.id}>
                <Link className="mobile-article-card" href={`/off/${article.slug}`}>
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
        <div className="mobile-metric-grid">
          <article><strong><MobileCountUp value={2.3} decimals={1} suffix="K+" /></strong><span>{copy.readers}</span></article>
          <article><strong><MobileCountUp value={1.8} decimals={1} suffix="K+" /></strong><span>{copy.choseSelf}</span></article>
          <article><strong><MobileCountUp value={700} suffix="+" /></strong><span>{copy.stories}</span></article>
          <article><strong><MobileCountUp value={2} suffix="K+" /></strong><span>{copy.rebuilding}</span></article>
        </div>
      </MobileReveal>

      <MobileReveal className="mobile-section" id="conoce-mas">
        <div className="mobile-snap-row compact">
          <a className="mobile-social-pill" href="https://www.linkedin.com/in/nathaliegarciaa/" target="_blank" rel="noreferrer">
            <strong><img src="/logo/linkedin-logo.svg" alt="" /></strong><span>Nathalie Garcia A.</span>
          </a>
          <a className="mobile-social-pill" href="https://www.instagram.com/nathalie.garciaa" target="_blank" rel="noreferrer">
            <strong><img src="/logo/instagram-logo.svg" alt="" /></strong><span>@nathalie.garciaa</span>
          </a>
          <a className="mobile-social-pill" href="https://www.instagram.com/off_journal?igsh=MWloaWd4NTFkZWRlcA%3D%3D" target="_blank" rel="noreferrer">
            <strong><img src="/logo/logo-off.png" alt="" /></strong><span>@off_journal</span>
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
