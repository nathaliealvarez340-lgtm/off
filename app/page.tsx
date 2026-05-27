import type { Article } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
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
        <div className="hero-copy">
          <p className="eyebrow">Editorial psicológica / OFF</p>
          <h1>
            Todo parece
            <br />
            avanzar.
            <br />
            <em>Pero algo dentro</em>
            <br />
            <em>
              de ti sigue <span>apagado.</span>
            </em>
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

        <div className="hero-portrait" aria-label="Imagen emocional de OFF">
          <Image
            src="/images/hero-off.webp"
            alt="Retrato cinematográfico OFF"
            fill
            priority
            sizes="(max-width: 820px) 100vw, 58vw"
          />
        </div>

        <div className="hero-aside">
          <span />
          <p>
            Se ve bien.
            <br />
            Pero se siente OFF.
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
                Sentir · entender · elegir · volver ·
              </textPath>
            </text>
          </svg>
        </div>
      </section>

      <div className="archive-strip" aria-hidden="true">
        <span>+</span>
        <p>Un archivo para la generación funcionalmente agotada.</p>
        <span>+</span>
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
