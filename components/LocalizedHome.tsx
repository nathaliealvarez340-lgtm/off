"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { logoutAction } from "@/app/actions";
import { SubscribeForm } from "@/components/SubscribeForm";
import { type ArticleTranslationMap, getLocalizedArticle } from "@/lib/article-localization";

export type PublicArticle = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string;
  category: string;
  readTime: string;
  publishedAt: string | null;
  featured: boolean;
  translations?: ArticleTranslationMap;
};

export type PublicUser = {
  name: string;
};

type Lang = "es" | "en" | "it" | "pt";

const visualMap: Record<string, string> = {
  "se-ve-bien-pero-se-siente-off": "/images/cap1-off.webp",
  "no-estas-cansado-estas-desconectado": "/images/cap2-off.webp",
  "la-razon-por-la-que-sigues-avanzando": "/images/cap3-off.webp",
};
const fallbackArticleImages = ["/images/cap1-off.webp", "/images/cap2-off.webp", "/images/cap3-off.webp"];

const localeMap: Record<Lang, string> = {
  es: "es-MX",
  en: "en-US",
  it: "it-IT",
  pt: "pt-BR",
};

const languages: Array<{ code: Lang; label: string }> = [
  { code: "es", label: "Español" },
  { code: "en", label: "English" },
  { code: "it", label: "Italiano" },
  { code: "pt", label: "Português" },
];

const copy = {
  es: {
    nav: ["Inicio", "Artículos", "Sobre OFF", "Impacto"],
    login: "Login",
    eyebrow: "EDITORIAL OFF by MAIA",
    hero: ["Todo parece", "avanzar.", "Pero algo dentro", "de ti sigue", "apagado."],
    subtitle:
      "OFF nace para una generación que está en busca del éxito personal y profesional mientras están construyendo su futuro, cuestionando su camino y aprendiendo a crecer sin perderse a sí mismos.",
    cta: "Entrar al portafolio",
    side: ["SE VE BIEN.", "PERO SE SIENTE"],
    orbit: "SENTIR · ENTENDER · ELEGIR · VOLVER · CONSTRUIR ·",
    strip: "Un portafolio para la generación funcionalmente agotada.",
    aboutTitle: "Qué es",
    aboutLines: ["No es motivación. Es claridad.", "No es productividad. Es comprensión.", "No es éxito vacío. Es reconexión."],
    aboutText: "OFF es el espacio donde la generación que aprendió a rendir, finalmente puede aprender a sentirse.",
    manifest: "Leer manifiesto",
    articles: ["Artículos", "recientes"],
    viewAll: "Ver todos los artículos",
    emptyKicker: "Portafolio en construcción",
    emptyTitle: "Aún no hay capítulos publicados.",
    emptyText: "Cuando publiques desde el panel privado, aparecerán aquí con esta dirección editorial.",
    readMore: "Leer más",
    philosophy: "Filosofía",
    philosophyText: "Algunas verdades que preferimos no ignorar.",
    quotes: [
      "La presión de convertirte en alguien está destruyendo quién eras.",
      "Muchos están triunfando sin sentirse realmente vivos.",
      "El problema no era tu disciplina. Era tu desconexión.",
    ],
    impactTitle: ["Nuestro", "impacto"],
    stats: [
      ["2.3K+", "Lectores alcanzados"],
      ["1.8K+", "Personas que decidieron elegirse a sí mismas"],
      ["700+", "Historias compartidas en la comunidad"],
      ["2K+", "Jóvenes que sienten cambios y OFF les ha funcionado"],
    ],
    moreTitle: ["Conoce", "más"],
    moreText: "Detrás de OFF hay alguien que también está en construcción.",
    linkedin: "Conecta en LinkedIn.",
    instagram: "Ver Instagram",
    footerTitle: ["No es solo contenido.", "Es un espacio para", "reconstruirte."],
    footerNewsletter: "Recibe nuevos artículos",
    footerRights: "© 2026 OFF. Todos los derechos reservados.",
    footerLinks: "Privacidad · Términos · Contacto",
  },
  en: {
    nav: ["Home", "Articles", "About OFF", "Impact"],
    login: "Login",
    eyebrow: "EDITORIAL OFF by MAIA",
    hero: ["Everything seems", "to move forward.", "But something inside", "you still feels", "switched off."],
    subtitle:
      "OFF is a psychological editorial platform for people building success while trying not to lose themselves.",
    cta: "Enter the portfolio",
    side: ["IT LOOKS GOOD.", "BUT IT FEELS"],
    orbit: "FEEL · UNDERSTAND · CHOOSE · RETURN · BUILD ·",
    strip: "A portfolio for the functionally exhausted generation.",
    aboutTitle: "What is",
    aboutLines: ["It is not motivation. It is clarity.", "It is not productivity. It is understanding.", "It is not empty success. It is reconnection."],
    aboutText: "OFF is the space where the generation that learned to perform can finally learn to feel.",
    manifest: "Read manifesto",
    articles: ["Recent", "articles"],
    viewAll: "View all articles",
    emptyKicker: "Portfolio in progress",
    emptyTitle: "No chapters published yet.",
    emptyText: "When you publish from the private panel, they will appear here with this editorial direction.",
    readMore: "Read more",
    philosophy: "OFF philosophy",
    philosophyText: "A few truths we prefer not to ignore.",
    quotes: [
      "The pressure to become someone is destroying who you were.",
      "Many people are succeeding without feeling truly alive.",
      "The problem was not your discipline. It was your disconnection.",
    ],
    impactTitle: ["Our", "impact"],
    stats: [
      ["2.3K+", "Readers reached"],
      ["1.8K+", "People who chose themselves"],
      ["700+", "Stories shared in the community"],
      ["2K+", "Young people who feel OFF has helped them change"],
    ],
    moreTitle: ["Learn", "more"],
    moreText: "Behind OFF there is someone who is also under construction.",
    linkedin: "Connect on LinkedIn.",
    instagram: "View Instagram",
    footerTitle: ["It is not just content.", "It is a space to", "rebuild yourself."],
    footerNewsletter: "Receive new articles",
    footerRights: "© 2026 OFF. All rights reserved.",
    footerLinks: "Privacy · Terms · Contact",
  },
  it: {
    nav: ["Inizio", "Articoli", "Su OFF", "Impatto"],
    login: "Login",
    eyebrow: "EDITORIAL OFF by MAIA",
    hero: ["Tutto sembra", "andare avanti.", "Ma qualcosa dentro", "di te resta", "spento."],
    subtitle:
      "OFF è una piattaforma editoriale psicologica per chi sta costruendo successo senza volersi perdere.",
    cta: "Entra nel portafoglio",
    side: ["SEMBRA ANDARE BENE.", "MA SI SENTE"],
    orbit: "SENTIRE · CAPIRE · SCEGLIERE · TORNARE · COSTRUIRE ·",
    strip: "Un portafoglio per la generazione funzionalmente esausta.",
    aboutTitle: "Che cos'è",
    aboutLines: ["Non è motivazione. È chiarezza.", "Non è produttività. È comprensione.", "Non è successo vuoto. È riconnessione."],
    aboutText: "OFF è lo spazio dove la generazione che ha imparato a rendere può finalmente imparare a sentire.",
    manifest: "Leggi manifesto",
    articles: ["Articoli", "recenti"],
    viewAll: "Vedi tutti gli articoli",
    emptyKicker: "Portafoglio in costruzione",
    emptyTitle: "Non ci sono ancora capitoli pubblicati.",
    emptyText: "Quando pubblicherai dal pannello privato, appariranno qui con questa direzione editoriale.",
    readMore: "Leggi di più",
    philosophy: "Filosofia OFF",
    philosophyText: "Alcune verità che preferiamo non ignorare.",
    quotes: [
      "La pressione di diventare qualcuno sta distruggendo chi eri.",
      "Molti stanno riuscendo senza sentirsi davvero vivi.",
      "Il problema non era la tua disciplina. Era la tua disconnessione.",
    ],
    impactTitle: ["Il nostro", "impatto"],
    stats: [
      ["2.3K+", "Lettori raggiunti"],
      ["1.8K+", "Persone che hanno scelto se stesse"],
      ["700+", "Storie condivise nella comunità"],
      ["2K+", "Giovani che sentono cambiamenti grazie a OFF"],
    ],
    moreTitle: ["Scopri", "di più"],
    moreText: "Dietro OFF c'è qualcuno che è ancora in costruzione.",
    linkedin: "Connettiti su LinkedIn.",
    instagram: "Vedi Instagram",
    footerTitle: ["Non è solo contenuto.", "È uno spazio per", "ricostruirti."],
    footerNewsletter: "Ricevi nuovi articoli",
    footerRights: "© 2026 OFF. Tutti i diritti riservati.",
    footerLinks: "Privacy · Termini · Contatto",
  },
  pt: {
    nav: ["Início", "Artigos", "Sobre OFF", "Impacto"],
    login: "Login",
    eyebrow: "EDITORIAL OFF by MAIA",
    hero: ["Tudo parece", "avançar.", "Mas algo dentro", "de você segue", "apagado."],
    subtitle:
      "OFF é uma plataforma editorial psicológica para pessoas construindo sucesso enquanto tentam não se perder.",
    cta: "Entrar no portfólio",
    side: ["PARECE BEM.", "MAS SE SENTE"],
    orbit: "SENTIR · ENTENDER · ESCOLHER · VOLTAR · CONSTRUIR ·",
    strip: "Um portfólio para a geração funcionalmente esgotada.",
    aboutTitle: "O que é",
    aboutLines: ["Não é motivação. É clareza.", "Não é produtividade. É compreensão.", "Não é sucesso vazio. É reconexão."],
    aboutText: "OFF é o espaço onde a geração que aprendeu a performar finalmente pode aprender a sentir.",
    manifest: "Ler manifesto",
    articles: ["Artigos", "recentes"],
    viewAll: "Ver todos os artigos",
    emptyKicker: "Portfólio em construção",
    emptyTitle: "Ainda não há capítulos publicados.",
    emptyText: "Quando você publicar pelo painel privado, eles aparecerão aqui com esta direção editorial.",
    readMore: "Ler mais",
    philosophy: "Filosofia OFF",
    philosophyText: "Algumas verdades que preferimos não ignorar.",
    quotes: [
      "A pressão de se tornar alguém está destruindo quem você era.",
      "Muitos estão vencendo sem se sentir realmente vivos.",
      "O problema não era sua disciplina. Era sua desconexão.",
    ],
    impactTitle: ["Nosso", "impacto"],
    stats: [
      ["2.3K+", "Leitores alcançados"],
      ["1.8K+", "Pessoas que decidiram escolher a si mesmas"],
      ["700+", "Histórias compartilhadas na comunidade"],
      ["2K+", "Jovens que sentem mudanças e OFF funcionou para eles"],
    ],
    moreTitle: ["Conheça", "mais"],
    moreText: "Por trás da OFF existe alguém que também está em construção.",
    linkedin: "Conecte-se no LinkedIn.",
    instagram: "Ver Instagram",
    footerTitle: ["Não é só conteúdo.", "É um espaço para", "se reconstruir."],
    footerNewsletter: "Receba novos artigos",
    footerRights: "© 2026 OFF. Todos os direitos reservados.",
    footerLinks: "Privacidade · Termos · Contato",
  },
};

function normalizeImageUrl(value?: string | null) {
  const clean = value?.trim();
  if (!clean) return null;
  if (clean.startsWith("public/")) return `/${clean.replace(/^public\//, "")}`;
  if (clean.startsWith("./public/")) return `/${clean.replace(/^\.\/public\//, "")}`;
  if (clean.startsWith("/")) return clean;
  if (/^https?:\/\//i.test(clean)) return clean;
  if (clean.startsWith("images/") || clean.startsWith("logo/") || clean.startsWith("uploads/")) return `/${clean}`;
  return null;
}

function editorialImage(article: PublicArticle, index = 0) {
  return normalizeImageUrl(article.coverImage) ?? visualMap[article.slug] ?? fallbackArticleImages[index % fallbackArticleImages.length];
}

function plainText(value: string) {
  return value.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function formatDate(date: string | null, lang: Lang) {
  if (!date) return "Draft";
  return new Intl.DateTimeFormat(localeMap[lang], {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

function articleHref(slug?: string, lang?: Lang) {
  return slug ? `/off/${slug}?lang=${lang ?? "es"}` : "#capitulos";
}

export function LocalizedHome({ articles, user }: { articles: PublicArticle[]; user: PublicUser | null }) {
  const [lang, setLang] = useState<Lang>("es");
  const [languageOpen, setLanguageOpen] = useState(false);
  const [sessionMessage, setSessionMessage] = useState("");
  const [subscriberGreeting, setSubscriberGreeting] = useState("");
  const t = copy[lang];
  const localizedArticles = useMemo(
    () => articles.map((article) => ({ ...article, ...getLocalizedArticle(article, lang) })),
    [articles, lang],
  );
  const featured = useMemo(() => localizedArticles.find((article) => article.featured) ?? localizedArticles[0], [localizedArticles]);

  useEffect(() => {
    const saved = window.localStorage.getItem("off-language") as Lang | null;
    if (saved && saved in copy) setLang(saved);
    const params = new URLSearchParams(window.location.search);
    if (params.get("welcome") === "1") {
      setSessionMessage("Bienvenido a OFF. Un espacio para cuestionar, reconstruir y volver a conectar con lo que realmente quieres construir. La siguiente historia te espera.");
    }
    if (params.get("logout") === "1") {
      setSessionMessage("Tu sesión se cerró con éxito.");
    }

    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setSubscriberGreeting("Buenos días");
    } else if (hour >= 12 && hour < 19) {
      setSubscriberGreeting("Buenas tardes");
    } else {
      setSubscriberGreeting("Buenas noches");
    }
  }, []);

  function chooseLanguage(nextLang: Lang) {
    setLang(nextLang);
    window.localStorage.setItem("off-language", nextLang);
    document.cookie = `off-language=${nextLang}; path=/; max-age=31536000; SameSite=Lax`;
    document.documentElement.lang = nextLang;
    window.dispatchEvent(new CustomEvent("off-language-change", { detail: nextLang }));
    setLanguageOpen(false);
  }

  return (
    <main className="site-shell home-shell">
      {sessionMessage ? <div className="public-session-banner">{sessionMessage}</div> : null}
      <nav className="nav cinematic-nav">
        <Link href="/" className="brand logo-brand" aria-label="OFF inicio">
          <img src="/logo/logo-off.png" alt="OFF Logo" width={104} height={42} />
        </Link>
        <div className="nav-links">
          <a href="#inicio">{t.nav[0]}</a>
          <a href="#capitulos">{t.nav[1]}</a>
          <a href="#revista">{t.nav[2]}</a>
          <a href="#suscripcion">{t.nav[3]}</a>
        </div>
        <div className="nav-actions">
          <div className={`language-menu ${languageOpen ? "open" : ""}`}>
            <button
              className="language-trigger"
              type="button"
              aria-expanded={languageOpen}
              aria-label="Cambiar idioma"
              onClick={() => setLanguageOpen((open) => !open)}
            >
              <span aria-hidden="true">🌐</span>
            </button>
            <div className="language-dropdown">
              {languages.map((language) => (
                <button
                  className={language.code === lang ? "active" : ""}
                  key={language.code}
                  onClick={() => chooseLanguage(language.code)}
                  type="button"
                >
                  {language.label}
                </button>
              ))}
            </div>
          </div>
          {user ? (
            <>
              <Link className="publish-link" href="/lounge">Member Lounge <span>→</span></Link>
              <form action={logoutAction}>
                <button className="publish-link nav-form-button" type="submit">
                  Cerrar sesión <span>→</span>
                </button>
              </form>
            </>
          ) : (
            <Link className="publish-link" href="/login">
              {t.login} <span>→</span>
            </Link>
          )}
        </div>
      </nav>

      {user ? (
        <motion.section className="subscriber-hero-card" id="mi-espacio" aria-label="Experiencia de suscriptor" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
          <Image src="/images/cap2-off.webp" alt="" fill priority={false} sizes="(max-width: 820px) 100vw, 1120px" />
          <div>
            <p className="eyebrow">OFF / Mi espacio</p>
            <h2>{subscriberGreeting ? `${subscriberGreeting}, ${user.name}.` : `Bienvenida, ${user.name}.`}</h2>
            <p>Tu portafolio está abierto. Sigue leyendo, pensando y construyendo sin vivir en automático.</p>
            <Link className="text-link purple-link" href="/lounge">Entrar al Member Lounge <span>→</span></Link>
          </div>
        </motion.section>
      ) : null}

      <motion.section className="hero-cinema" id="inicio" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.9 }}>
        <Image className="hero-background" src="/images/hero-off.webp" alt="" fill priority sizes="100vw" />
        <div className="hero-copy">
          <p className="eyebrow">{t.eyebrow}</p>
          <h1>
            <span className="hero-title-line">{t.hero[0]}</span>
            <span className="hero-title-line">{t.hero[1]}</span>
            <span className="hero-title-line">{t.hero[2]}</span>
            <span className="hero-title-line">{t.hero[3]}</span>
            <span className="hero-title-line">
              <em>{t.hero[4].replace(/\.$/, "")}</em>
              {t.hero[4].endsWith(".") ? "." : ""}
            </span>
          </h1>
          <p>{t.subtitle}</p>
          <div className="actions">
            <Link className="button violet-button" href={featured ? articleHref(featured.slug, lang) : "#capitulos"}>
              {t.cta} <span>→</span>
            </Link>
          </div>
        </div>

        <div className="hero-aside">
          <span />
          <p>
            {t.side[0]}
            <br />
            {t.side[1]} <strong>OFF.</strong>
          </p>
        </div>

        <div className="orbital-note" aria-hidden="true">
          <span />
          <svg viewBox="0 0 160 160">
            <defs>
              <path id="off-orbit" d="M80 80 m -58 0 a 58 58 0 1 1 116 0 a 58 58 0 1 1 -116 0" />
            </defs>
            <text>
              <textPath href="#off-orbit" startOffset="0%">
                {t.orbit}
              </textPath>
            </text>
          </svg>
        </div>
      </motion.section>

      <div className="archive-strip" aria-hidden="true">
        <p>{t.strip}</p>
      </div>

      <motion.section className="about-cinema" id="revista" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.14 }} transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}>
        <div className="about-copy">
          <p className="section-kicker">
            {t.aboutTitle} <span>OFF</span>
          </p>
          <p>
            {t.aboutLines[0]}
            <br />
            {t.aboutLines[1]}
            <br />
            {t.aboutLines[2]}
          </p>
          <p>{t.aboutText}</p>
          <a className="text-link purple-link" href="#capitulos">
            {t.manifest} <span>→</span>
          </a>
        </div>
        <div className="about-image">
          <Image src="/images/off-quees.webp" alt="" fill sizes="(max-width: 820px) 100vw, 62vw" />
          <div className="purple-block" />
        </div>
      </motion.section>

      <motion.section className="articles-cinema" id="capitulos" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.08 }} transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}>
        <div className="articles-head cinematic-head">
          <div>
            <h2 className="section-title">
              {t.articles[0]}
              <br />
              <em>{t.articles[1]}</em>
            </h2>
          </div>
          {localizedArticles.length > 0 ? (
            <Link className="purple-link text-link" href={featured ? articleHref(featured.slug, lang) : "#capitulos"}>
              {t.viewAll} <span>→</span>
            </Link>
          ) : null}
        </div>

        {localizedArticles.length === 0 ? (
          <div className="empty-editorial">
            <p className="eyebrow">{t.emptyKicker}</p>
            <h3>{t.emptyTitle}</h3>
            <p>{t.emptyText}</p>
          </div>
        ) : (
          <div className="article-grid">
            {localizedArticles.map((article, index) => (
              <article className="article-card cinematic-card" key={article.id}>
                <Link className="cover-frame" href={articleHref(article.slug, lang)}>
                  <Image src={editorialImage(article, index)} alt={plainText(article.title)} fill sizes="(max-width: 820px) 100vw, 31vw" />
                </Link>
                <div className="article-copy">
                  <span className="pill">{article.category}</span>
                  <h3>{plainText(article.title)}</h3>
                  <p>{plainText(article.excerpt)}</p>
                  <div className="meta">
                    <span>{formatDate(article.publishedAt, lang)}</span>
                    <span>{article.readTime}</span>
                  </div>
                  <Link className="purple-link text-link" href={articleHref(article.slug, lang)}>
                    {t.readMore} <span>→</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </motion.section>

      <motion.section className="philosophy-band" aria-label={t.philosophy} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.18 }} transition={{ duration: 0.62 }}>
        <div>
          <h2>
            {t.philosophy} <span>OFF</span>
          </h2>
          <p>{t.philosophyText}</p>
        </div>
        {t.quotes.map((quote) => (
          <blockquote key={quote}>{quote}</blockquote>
        ))}
      </motion.section>

      <motion.section className="impact-cinema" aria-label={t.impactTitle.join(" ")} initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.16 }} transition={{ duration: 0.65 }}>
        <div className="impact-title">
          <h2>
            {t.impactTitle[0]}
            <br />
            <em>{t.impactTitle[1]}</em>
          </h2>
        </div>
        {t.stats.map(([value, label]) => (
          <div className="impact-stat" key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </motion.section>

      <motion.section className="linkedin-cinema" id="conoce-mas" aria-label={t.moreTitle.join(" ")} initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.12 }} transition={{ duration: 0.65 }}>
        <div>
          <h2>
            {t.moreTitle[0]} <em>{t.moreTitle[1]}</em>
          </h2>
          <p>{t.moreText}</p>
          <a className="purple-link text-link" href="https://mx.linkedin.com/in/nathaliegarciaa" target="_blank">
            {t.linkedin} <span>→</span>
          </a>
        </div>
        <div className="social-badges">
          <a className="profile-social-card" href="https://mx.linkedin.com/in/nathaliegarciaa" target="_blank">
            <div className="profile-social-head">
              <span className="platform-mark linkedin-mark">in</span>
              <strong>LINKEDIN</strong>
            </div>
            <div className="profile-social-body">
              <span className="social-user">NATHALIE GARCIA A.</span>
              <span className="social-profile-button">Ver perfil</span>
            </div>
          </a>

          <a className="profile-social-card" href="https://www.instagram.com/nathalie.garciaa" target="_blank">
            <div className="profile-social-head">
              <span className="platform-mark instagram-mark" aria-hidden="true">
                <svg viewBox="0 0 24 24" role="img">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17" cy="7" r="1" />
                </svg>
              </span>
              <strong>INSTAGRAM</strong>
            </div>
            <div className="profile-social-body">
              <span className="social-user">@NATHALIE.GARCIAA</span>
              <span className="social-profile-button">Ver perfil</span>
            </div>
          </a>

          <a className="profile-social-card" href="https://www.instagram.com/off_journal?igsh=MWloaWd4NTFkZWRlcA==" target="_blank">
            <div className="profile-social-head">
              <span className="platform-mark instagram-mark" aria-hidden="true">
                <svg viewBox="0 0 24 24" role="img">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17" cy="7" r="1" />
                </svg>
              </span>
              <strong>OFF OFFICIAL</strong>
            </div>
            <div className="profile-social-body">
              <span className="social-user">@OFF_JOURNAL</span>
              <span className="social-profile-button">Ver perfil</span>
            </div>
          </a>

          <a className="profile-social-card" href="https://x.com/off_journal" target="_blank">
            <div className="profile-social-head">
              <span className="platform-mark x-mark">X</span>
              <strong>X OFFICIAL</strong>
            </div>
            <div className="profile-social-body">
              <span className="social-user">@OFF_JOURNAL</span>
              <span className="social-profile-button">Ver perfil</span>
            </div>
          </a>
        </div>
      </motion.section>

      <footer className="off-footer" id="suscripcion">
        <div className="footer-logo">
          <img src="/logo/logo-off.png" alt="OFF Logo" width={132} height={54} />
        </div>
        <div>
          <h2>
            {t.footerTitle[0]}
            <br />
            {t.footerTitle[1]} <span>{t.footerTitle[2]}</span>
          </h2>
        </div>
        <div className="footer-form">
          <p className="eyebrow">{t.footerNewsletter}</p>
          <SubscribeForm />
        </div>
        <div className="footer-bottom">
          <span>{t.footerRights}</span>
          <nav aria-label="Información legal">
            <Link href="/privacidad">Privacidad</Link>
            <Link href="/terminos">Términos</Link>
            <Link href="/contacto">Contacto</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
