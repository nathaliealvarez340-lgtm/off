import Image from "next/image";
import Link from "next/link";
import { SubscribeForm } from "@/components/SubscribeForm";
import { formatDate, getFeaturedArticle, getPublishedArticles } from "@/lib/articles";

const tags = ["Vida", "Negocios", "20s", "Mentalidad", "Carrera", "Crecimiento"];

export default async function Home() {
  const articles = await getPublishedArticles();
  const featured = getFeaturedArticle(articles);
  const rest = articles.filter((article) => article.id !== featured?.id);

  return (
    <main className="site-shell">
      <nav className="nav">
        <Link href="/" className="brand">
          <span className="brand-mark">O</span>
          OFF
        </Link>
        <div className="nav-links">
          <a href="#revista">Revista</a>
          <a href="#capitulos">Capítulos</a>
          <a href="#suscripcion">Suscripción</a>
          <Link href="/admin">Admin</Link>
        </div>
      </nav>

      <section className="section hero">
        <div>
          <p className="eyebrow">OFF / Editorial digital</p>
          <h1>
            Todo parece avanzar.
            <br />
            Tú no.
          </h1>
          <p>
            OFF es una editorial digital para una generación que está construyendo su vida mientras intenta entender por
            qué se siente desconectada.
          </p>
          <div className="actions">
            <Link className="button" href={featured ? `/off/${featured.slug}` : "#capitulos"}>
              Leer última edición
            </Link>
            <a className="ghost-button" href="#suscripcion">
              Suscribirme
            </a>
          </div>
          <div className="tags">
            {tags.map((tag) => (
              <span className="tag" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="editorial-art" aria-label="Arte editorial de OFF">
          <div className="art-card">
            <strong>Una pausa para entender hacia dónde estás yendo.</strong>
            <span>Capítulos sobre ambición, identidad, cansancio y dirección.</span>
          </div>
        </div>
      </section>

      <section className="section intro-grid" id="revista">
        <div className="intro-copy">
          <p className="eyebrow">Qué es OFF</p>
          <h2>Una revista para pensar la vida mientras la construyes.</h2>
          <p>
            OFF nace para hablar de eso que muchos jóvenes viven, pero pocos saben explicar: avanzar, compararse,
            cansarse, exigirse, construir una carrera, intentar tener una vida y sentir que algo no termina de conectar.
          </p>
          <p>
            Cada capítulo mezcla narrativa, reflexión y estrategia para ayudarte a entender lo que estás viviendo y
            convertirlo en dirección.
          </p>
        </div>
        <div className="mockup" aria-hidden="true">
          <div className="mockup-lines" />
        </div>
      </section>

      <section className="section" id="capitulos">
        <div className="articles-head">
          <div>
            <p className="eyebrow">Últimas ediciones</p>
            <h2 className="section-title">Capítulos publicados</h2>
          </div>
          <p>Una lista editorial para leer sin prisa: vida, carrera, mentalidad, negocio y crecimiento personal.</p>
        </div>

        {featured ? (
          <article className="featured-card">
            <div className="featured-copy">
              <span className="pill">{featured.category}</span>
              <h3>{featured.title}</h3>
              <p>{featured.excerpt}</p>
              <div className="meta">
                <span>{formatDate(featured.publishedAt)}</span>
                <span>{featured.readTime}</span>
                <span>{featured.author}</span>
              </div>
              <div className="actions">
                <Link className="button" href={`/off/${featured.slug}`}>
                  Leer capítulo
                </Link>
              </div>
            </div>
            <Link className="cover-frame" href={`/off/${featured.slug}`}>
              <Image src={featured.coverImage} alt={featured.title} width={900} height={700} priority />
            </Link>
          </article>
        ) : null}

        <div className="article-list">
          {rest.map((article) => (
            <article className="article-card" key={article.id}>
              <Link className="cover-frame" href={`/off/${article.slug}`}>
                <Image src={article.coverImage} alt={article.title} width={520} height={420} />
              </Link>
              <div className="article-copy">
                <span className="pill">{article.category}</span>
                <h3>{article.title}</h3>
                <p>{article.excerpt}</p>
                <div className="meta">
                  <span>{formatDate(article.publishedAt)}</span>
                  <span>{article.readTime}</span>
                  <span>{article.author}</span>
                </div>
                <div className="actions">
                  <Link className="ghost-button" href={`/off/${article.slug}`}>
                    Leer capítulo
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section" id="suscripcion">
        <div className="subscribe-panel">
          <div>
            <p className="eyebrow">Newsletter</p>
            <h2>Suscríbete a OFF</h2>
            <p>
              Recibe cada nuevo capítulo directamente en tu correo. Sin ruido. Sin spam. Solo ideas que te ayuden a
              pensar, vivir y construir mejor.
            </p>
          </div>
          <SubscribeForm />
        </div>
      </section>
    </main>
  );
}
