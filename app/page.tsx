import type { Article } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { SubscribeForm } from "@/components/SubscribeForm";
import { formatDate, getFeaturedArticle, getPublishedArticles } from "@/lib/articles";

const visualMap: Record<string, string> = {
  "se-ve-bien-pero-se-siente-off": "/images/cap1-off.webp",
  "no-estas-cansado-estas-desconectado": "/images/cap2-off.webp",
  "la-razon-por-la-que-sigues-avanzando": "/images/cap3-off.webp",
};

function editorialImage(article: Article) {
  return visualMap[article.slug] ?? article.coverImage;
}

export default async function Home() {
  const articles = await getPublishedArticles();
  const featured = getFeaturedArticle(articles);

  return (
    <main className="site-shell home-shell">
      <Script src="https://platform.linkedin.com/badges/js/profile.js" strategy="afterInteractive" />
      <nav className="nav cinematic-nav">
        <Link href="/" className="brand logo-brand" aria-label="OFF inicio">
          <img src="/logo/logo-off.svg" alt="OFF" width={104} height={42} />
        </Link>
        <div className="nav-links">
          <a href="#inicio">Inicio</a>
          <a href="#capitulos">Artículos</a>
          <a href="#revista">Sobre OFF</a>
          <a href="#suscripcion">Impacto</a>
        </div>
        <Link className="publish-link" href="/admin">
          Login <span>→</span>
        </Link>
      </nav>

      <section className="hero-cinema" id="inicio">
        <Image
          className="hero-background"
          src="/images/hero-off.webp"
          alt=""
          fill
          priority
          sizes="100vw"
        />
        <div className="hero-copy">
          <p className="eyebrow">Editorial psicológica / OFF</p>
          <h1>
            <span className="hero-title-line">Todo parece</span>
            <span className="hero-title-line">avanzar.</span>
            <span className="hero-title-line">Pero algo dentro</span>
            <span className="hero-title-line">de ti sigue</span>
            <span className="hero-title-line">
              <em>apagado.</em>
            </span>
          </h1>
          <p>
            OFF es una plataforma editorial psicológica creada para personas que están construyendo éxito mientras
            intentan no perderse a sí mismas.
          </p>
          <div className="actions">
            <Link className="button violet-button" href={featured ? `/off/${featured.slug}` : "#capitulos"}>
              Entrar al archivo <span>→</span>
            </Link>
          </div>
        </div>

        <div className="hero-aside">
          <span />
          <p>
            SE VE BIEN.
            <br />
            PERO SE SIENTE <strong>OFF.</strong>
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
                SENTIR · ENTENDER · ELEGIR · VOLVER · CONSTRUIR ·
              </textPath>
            </text>
          </svg>
        </div>
      </section>

      <div className="archive-strip" aria-hidden="true">
        <p>Un archivo para la generación funcionalmente agotada.</p>
      </div>

      <section className="about-cinema" id="revista">
        <div className="about-copy">
          <p className="section-kicker">
            Qué es <span>OFF</span>
          </p>
          <p>
            No es motivación. Es claridad.
            <br />
            No es productividad. Es comprensión.
            <br />
            No es éxito vacío. Es reconexión.
          </p>
          <p>OFF es el espacio donde la generación que aprendió a rendir, finalmente puede aprender a sentirse.</p>
          <a className="text-link purple-link" href="#capitulos">
            Leer manifiesto <span>→</span>
          </a>
        </div>
        <div className="about-image">
          <Image
            src="/images/off-quees.webp"
            alt="Imagen editorial sobre qué es OFF"
            fill
            sizes="(max-width: 820px) 100vw, 62vw"
          />
          <div className="purple-block" />
        </div>
      </section>

      <section className="articles-cinema" id="capitulos">
        <div className="articles-head cinematic-head">
          <div>
            <h2 className="section-title">
              Artículos
              <br />
              <em>recientes</em>
            </h2>
          </div>
          {articles.length > 0 ? (
            <Link className="purple-link text-link" href={featured ? `/off/${featured.slug}` : "#capitulos"}>
              Ver todos los artículos <span>→</span>
            </Link>
          ) : null}
        </div>

        {articles.length === 0 ? (
          <div className="empty-editorial">
            <p className="eyebrow">Archivo en construcción</p>
            <h3>Aún no hay capítulos publicados.</h3>
            <p>Cuando publiques desde el panel privado, aparecerán aquí con esta dirección editorial.</p>
          </div>
        ) : (
          <div className="article-grid">
            {articles.map((article) => (
              <article className="article-card cinematic-card" key={article.id}>
                <Link className="cover-frame" href={`/off/${article.slug}`}>
                  <Image src={editorialImage(article)} alt={article.title} fill sizes="(max-width: 820px) 100vw, 31vw" />
                </Link>
                <div className="article-copy">
                  <span className="pill">{article.category}</span>
                  <h3>{article.title}</h3>
                  <p>{article.excerpt}</p>
                  <div className="meta">
                    <span>{formatDate(article.publishedAt)}</span>
                    <span>{article.readTime}</span>
                  </div>
                  <Link className="purple-link text-link" href={`/off/${article.slug}`}>
                    Leer más <span>→</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="philosophy-band" aria-label="Filosofía OFF">
        <div>
          <h2>
            Filosofía <span>OFF</span>
          </h2>
          <p>Algunas verdades que preferimos no ignorar.</p>
        </div>
        <blockquote>La presión de convertirte en alguien está destruyendo quién eras.</blockquote>
        <blockquote>Muchos están triunfando sin sentirse realmente vivos.</blockquote>
        <blockquote>El problema no era tu disciplina. Era tu desconexión.</blockquote>
      </section>

      <section className="impact-cinema" aria-label="Resultados e impacto de OFF">
        <div className="impact-title">
          <h2>
            Nuestro
            <br />
            <em>impacto</em>
          </h2>
        </div>
        <div className="impact-stat">
          <strong>2.3K+</strong>
          <span>Lectores alcanzados</span>
        </div>
        <div className="impact-stat">
          <strong>1.8K+</strong>
          <span>Personas que decidieron elegirse a sí mismas</span>
        </div>
        <div className="impact-stat">
          <strong>700+</strong>
          <span>Historias compartidas en la comunidad</span>
        </div>
        <div className="impact-stat">
          <strong>2K+</strong>
          <span>Jóvenes que sienten cambios y OFF les ha funcionado</span>
        </div>
      </section>

      <section className="linkedin-cinema" aria-label="Conoce más">
        <div>
          <h2>
            Conoce <em>más</em>
          </h2>
          <p>Detrás de OFF hay alguien que también está en construcción.</p>
          <a className="purple-link text-link" href="https://mx.linkedin.com/in/nathaliegarciaa" target="_blank">
            Conecta en LinkedIn. <span>→</span>
          </a>
        </div>
        <div className="social-badges">
          <div className="linkedin-badge-wrap">
            <div
              className="badge-base LI-profile-badge"
              data-locale="es_ES"
              data-size="medium"
              data-theme="dark"
              data-type="VERTICAL"
              data-vanity="nathaliegarciaa"
              data-version="v1"
            >
              <a
                className="badge-base__link LI-simple-link"
                href="https://mx.linkedin.com/in/nathaliegarciaa?trk=profile-badge"
              >
                ɴᴀᴛʜᴀʟɪᴇ ɢᴀʀᴄɪᴀ
              </a>
            </div>
          </div>

          <a className="instagram-card" href="https://www.instagram.com/nathalie.garciaa" target="_blank">
            <span className="instagram-mark">IG</span>
            <div>
              <strong>Nathalie Garcia</strong>
              <p>@nathalie.garciaa</p>
            </div>
            <span className="instagram-link">Ver Instagram</span>
          </a>
        </div>
      </section>

      <footer className="off-footer" id="suscripcion">
        <div className="footer-logo">
          <img src="/logo/logo-off.svg" alt="OFF" width={132} height={54} />
        </div>
        <div>
          <h2>
            No es solo contenido.
            <br />
            Es un espacio para <span>reconstruirte.</span>
          </h2>
        </div>
        <div className="footer-form">
          <p className="eyebrow">Recibe nuevos artículos</p>
          <SubscribeForm />
        </div>
        <div className="footer-bottom">
          <span>© 2026 OFF. Todos los derechos reservados.</span>
          <span>Privacidad · Términos · Contacto</span>
        </div>
      </footer>
    </main>
  );
}
