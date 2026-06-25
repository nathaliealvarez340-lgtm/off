"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { SubscribeForm } from "@/components/SubscribeForm";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import type { PublicArticle } from "@/components/LocalizedHome";

function clean(value: string) {
  return value.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function imageFor(article: PublicArticle, index: number) {
  if (article.coverImage?.startsWith("/")) return article.coverImage;
  return ["/images/cap1-off.webp", "/images/cap2-off.webp", "/images/cap3-off.webp"][index % 3];
}

export function MobileHome({ articles }: { articles: PublicArticle[] }) {
  const featured = articles[0];

  return (
    <main className="off-mobile mobile-home">
      <nav className="mobile-topbar" aria-label="OFF mobile">
        <Link href="/" aria-label="OFF inicio"><img src="/logo/logo-off.png" alt="OFF" /></Link>
        <div>
          <LanguageSwitcher compact />
          <Link href="/login">Login</Link>
        </div>
      </nav>

      <motion.header className="mobile-hero" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
        <img src="/images/hero-off.webp" alt="" />
        <div>
          <p className="mobile-kicker">EDITORIAL OFF by MAIA</p>
          <h1>Todo parece avanzar. <em>Pero algo dentro sigue apagado.</em></h1>
          <p>OFF nace para una generación que está construyendo éxito mientras intenta no perderse a sí misma.</p>
          <Link className="mobile-primary" href={featured ? `/off/${featured.slug}` : "/login"}>Entrar a OFF</Link>
        </div>
      </motion.header>

      <section className="mobile-section">
        <div className="mobile-section-head">
          <span>Capítulos</span>
          <h2>Lecturas recientes</h2>
        </div>
        {articles.length ? (
          <div className="mobile-snap-row" aria-label="Artículos recientes">
            {articles.map((article, index) => (
              <Link className="mobile-article-card" href={`/off/${article.slug}`} key={article.id}>
                <img src={imageFor(article, index)} alt="" />
                <span>{article.category}</span>
                <h3>{clean(article.title)}</h3>
                <p>{clean(article.excerpt)}</p>
                <small>{article.readTime}</small>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mobile-empty-card">
            <span>Archivo en construcción</span>
            <p>Cuando publiques capítulos, aparecerán aquí con datos reales.</p>
          </div>
        )}
      </section>

      <section className="mobile-about-card">
        <img src="/images/off-quees.webp" alt="" />
        <div>
          <span>Qué es OFF</span>
          <h2>No es motivación. Es claridad.</h2>
          <p>Una editorial psicológica para volver a pensar, sentir y construir con dirección.</p>
        </div>
      </section>

      <section className="mobile-section">
        <div className="mobile-section-head">
          <span>Impacto</span>
          <h2>Números que no hacen ruido</h2>
        </div>
        <div className="mobile-metric-grid">
          <article><strong>2.3K+</strong><span>Lectores alcanzados</span></article>
          <article><strong>1.8K+</strong><span>Personas que decidieron elegirse</span></article>
          <article><strong>700+</strong><span>Historias compartidas</span></article>
          <article><strong>2K+</strong><span>Jóvenes reconstruyendo dirección</span></article>
        </div>
      </section>

      <section className="mobile-section" id="conoce-mas">
        <div className="mobile-section-head">
          <span>Conoce más</span>
          <h2>Detrás de OFF</h2>
        </div>
        <div className="mobile-snap-row compact">
          <a className="mobile-social-pill" href="https://www.linkedin.com/in/nathaliegarciaa/" target="_blank" rel="noreferrer">
            <strong>in</strong><span>Nathalie Garcia A.</span>
          </a>
          <a className="mobile-social-pill" href="https://www.instagram.com/nathalie.garciaa" target="_blank" rel="noreferrer">
            <strong>IG</strong><span>@nathalie.garciaa</span>
          </a>
          <a className="mobile-social-pill" href="https://www.instagram.com/off_journal?igsh=MWloaWd4NTFkZWRlcA%3D%3D" target="_blank" rel="noreferrer">
            <strong>OFF</strong><span>@off_journal</span>
          </a>
        </div>
      </section>

      <section className="mobile-subscribe" id="suscripcion">
        <span>Recibe OFF</span>
        <h2>Sin ruido. Solo ideas que te regresan dirección.</h2>
        <SubscribeForm />
      </section>

      <footer className="mobile-footer">
        <img src="/logo/logo-off.png" alt="OFF" />
        <span>© 2026 OFF. Todos los derechos reservados.</span>
      </footer>
    </main>
  );
}
