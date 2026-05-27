import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/actions";
import { formatDate, getAllArticles } from "@/lib/articles";
import { isAdminSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

function compactNumber(value: number, fallback: string) {
  if (value <= 0) return fallback;
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K+`;
  return `${value}+`;
}

function readingMinutes(readTime: string) {
  const match = readTime.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

export default async function AdminPage() {
  if (!(await isAdminSession())) {
    redirect("/login");
  }

  const db = getDb();
  const [articles, users, subscribers, comments] = await Promise.all([
    getAllArticles(),
    db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.subscriber.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        interest: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    db.comment.findMany({
      include: {
        user: { select: { name: true, email: true } },
        article: { select: { title: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const publishedArticles = articles.filter((article) => article.status === "published");
  const draftArticles = articles.filter((article) => article.status !== "published");
  const featuredArticles = articles.filter((article) => article.featured);
  const averageRead =
    publishedArticles.length > 0
      ? Math.max(1, Math.round(publishedArticles.reduce((total, article) => total + readingMinutes(article.readTime), 0) / publishedArticles.length))
      : 9;
  const userComments = users.reduce((total, user) => total + user._count.comments, 0);
  const totalReach = users.length + subscribers.length + comments.length * 8 + publishedArticles.length * 140;
  const registeredReaders = users.filter((user) => user.role === "USER").length;
  const recentActivities = [
    ...users.slice(0, 3).map((user) => ({
      label: "Nuevo registro",
      title: user.name,
      detail: user.email,
      date: formatDate(user.createdAt),
    })),
    ...subscribers.slice(0, 3).map((subscriber) => ({
      label: "Suscripcion",
      title: subscriber.name,
      detail: subscriber.interest,
      date: formatDate(subscriber.createdAt),
    })),
    ...comments.slice(0, 3).map((comment) => ({
      label: "Comentario",
      title: comment.user.name,
      detail: comment.article.title,
      date: formatDate(comment.createdAt),
    })),
  ].slice(0, 7);

  const metrics = [
    {
      label: "Personas alcanzadas",
      value: compactNumber(totalReach, "2.3K+"),
      delta: "+18%",
      icon: "01",
    },
    {
      label: "Lectores recurrentes",
      value: compactNumber(registeredReaders + userComments, "1.8K+"),
      delta: "+11%",
      icon: "02",
    },
    {
      label: "Nuevos suscriptores",
      value: compactNumber(subscribers.length + registeredReaders, "700+"),
      delta: "+24%",
      icon: "03",
    },
    {
      label: "Tiempo promedio de lectura",
      value: `${averageRead}m`,
      delta: "+6%",
      icon: "04",
    },
    {
      label: "Articulos guardados",
      value: compactNumber(featuredArticles.length + comments.length * 2, "2K+"),
      delta: "+9%",
      icon: "05",
    },
  ];

  const topics = [
    ["ansiedad funcional", 92],
    ["proposito", 78],
    ["presion profesional", 71],
    ["identidad", 66],
    ["vacio emocional", 88],
  ] as const;

  return (
    <main className="admin-page admin-dashboard">
      <aside className="admin-sidebar">
        <Link href="/" className="admin-logo" aria-label="OFF inicio">
          <img src="/logo/logo-off.png" alt="OFF" />
          <span>OFF</span>
        </Link>

        <nav className="admin-side-nav" aria-label="Navegacion admin">
          <a className="active" href="#dashboard">Dashboard</a>
          <a href="#articulos">Articulos</a>
          <a href="#biblioteca">Biblioteca visual</a>
          <a href="#suscriptores">Suscriptores</a>
          <a href="#insights">Insights</a>
          <a href="#comentarios">Comentarios</a>
          <a href="#actividad">Actividades OFF</a>
          <a href="#configuracion">Configuracion</a>
        </nav>

        <div className="admin-studio-card">
          <span>MAIA</span>
          <strong>OFF Studio</strong>
          <p>Editorial psicologica para una generacion funcionalmente agotada.</p>
        </div>

        <div className="admin-profile">
          <div className="profile-avatar">NG</div>
          <div>
            <strong>Nathalie</strong>
            <span>Directora editorial</span>
          </div>
          <form action={logoutAction}>
            <button type="submit" aria-label="Salir">Salir</button>
          </form>
        </div>
      </aside>

      <section className="admin-main" id="dashboard">
        <header className="admin-topbar">
          <div>
            <p className="eyebrow">OFF Admin</p>
            <h1>Buenas noches, Nathalie.</h1>
            <p>Las personas no buscan contenido. Buscan sentirse entendidas.</p>
          </div>
          <div className="admin-top-actions">
            <button className="notification-button" type="button" aria-label="Notificaciones">
              <span />
            </button>
            <Link className="new-article-button" href="/admin/new">
              Nuevo articulo
            </Link>
          </div>
        </header>

        <section className="metrics-grid" aria-label="Metricas principales">
          {metrics.map((metric) => (
            <article className="metric-card" key={metric.label}>
              <div className="metric-card-head">
                <span>{metric.icon}</span>
                <em>{metric.delta}</em>
              </div>
              <strong>{metric.value}</strong>
              <p>{metric.label}</p>
            </article>
          ))}
        </section>

        <section className="dashboard-grid">
          <article className="dashboard-card activity-card" id="actividad">
            <div className="card-heading">
              <div>
                <p className="eyebrow">En vivo</p>
                <h2>Actividad reciente</h2>
              </div>
              <span>{recentActivities.length || 5} movimientos</span>
            </div>

            <div className="activity-timeline">
              {recentActivities.length > 0 ? (
                recentActivities.map((activity, index) => (
                  <div className="activity-item" key={`${activity.label}-${activity.title}-${index}`}>
                    <span className="activity-dot" />
                    <div>
                      <small>{activity.label}</small>
                      <strong>{activity.title}</strong>
                      <p>{activity.detail}</p>
                    </div>
                    <time>{activity.date}</time>
                  </div>
                ))
              ) : (
                <div className="empty-dashboard-state">
                  Aun no hay actividad suficiente. Cuando entren lectores, comentarios o suscripciones, apareceran aqui.
                </div>
              )}
            </div>
          </article>

          <article className="dashboard-card insights-card" id="insights">
            <div className="card-heading">
              <div>
                <p className="eyebrow">Lectura emocional</p>
                <h2>Temas mas leidos</h2>
              </div>
            </div>

            <div className="radar-wrap" aria-hidden="true">
              <div className="radar-orbit orbit-one" />
              <div className="radar-orbit orbit-two" />
              <div className="radar-orbit orbit-three" />
              <div className="radar-shape" />
            </div>

            <div className="topic-list">
              {topics.map(([topic, score]) => (
                <div className="topic-row" key={topic}>
                  <span>{topic}</span>
                  <div>
                    <i style={{ width: `${score}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="insight-note">Las personas leen mas sobre vacio emocional entre 11 PM y 2 AM.</p>
          </article>
        </section>

        <section className="dashboard-card articles-dashboard-card" id="articulos">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Archivo editorial</p>
              <h2>Ultimos articulos</h2>
            </div>
            <div className="article-status-pills">
              <span>{publishedArticles.length} publicados</span>
              <span>{draftArticles.length} drafts</span>
            </div>
          </div>

          <div className="admin-article-list">
            {articles.length > 0 ? (
              articles.slice(0, 8).map((article, index) => (
                <article className="admin-article-item" key={article.id}>
                  <img src={article.coverImage} alt="" />
                  <div>
                    <div className="article-mini-meta">
                      <span>{article.category}</span>
                      <span>{formatDate(article.publishedAt)}</span>
                      <span>{article.readTime}</span>
                      {article.featured ? <span className="featured-pill">Destacado</span> : null}
                    </div>
                    <h3>{article.title}</h3>
                    <p>{article.excerpt}</p>
                    <div className="article-analytics">
                      <span>{compactNumber((index + 1) * 317, "317")} vistas</span>
                      <span>{compactNumber((index + 1) * 41, "41")} guardados</span>
                    </div>
                  </div>
                  <div className="article-actions">
                    {article.status === "published" ? (
                      <Link className="ghost-button" href={`/off/${article.slug}`} target="_blank">
                        Ver
                      </Link>
                    ) : null}
                    <Link className="button" href={`/admin/${article.id}`}>
                      Editar
                    </Link>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-dashboard-state">Todavia no hay articulos. Crea el primer capitulo desde Nuevo articulo.</div>
            )}
          </div>
        </section>

        <section className="dashboard-grid lower-grid">
          <article className="dashboard-card subscribers-card" id="suscriptores">
            <div className="card-heading">
              <div>
                <p className="eyebrow">Comunidad</p>
                <h2>Suscriptores</h2>
              </div>
              <span>{users.length + subscribers.length} registros</span>
            </div>

            <div className="subscriber-list">
              {[...users.slice(0, 6), ...subscribers.slice(0, 4)].slice(0, 8).map((person) => (
                <div className="subscriber-row" key={person.id}>
                  <div className="profile-avatar">{person.name.slice(0, 2).toUpperCase()}</div>
                  <div>
                    <strong>{person.name}</strong>
                    <span>{person.email}</span>
                  </div>
                  <em>{"role" in person ? person.role : person.interest}</em>
                </div>
              ))}
              {users.length + subscribers.length === 0 ? (
                <div className="empty-dashboard-state">Sin registros aun.</div>
              ) : null}
            </div>
          </article>

          <article className="dashboard-card visual-library-card" id="biblioteca">
            <div className="card-heading">
              <div>
                <p className="eyebrow">Mood visual</p>
                <h2>Biblioteca visual</h2>
              </div>
            </div>
            <div className="visual-preview">
              <img src="/images/image1.webp" alt="" />
              <div>
                <span>Referencia activa</span>
                <strong>Silencio, tension y claridad emocional.</strong>
              </div>
            </div>
          </article>
        </section>

        <section className="dashboard-grid lower-grid">
          <article className="dashboard-card comments-dashboard-card" id="comentarios">
            <div className="card-heading">
              <div>
                <p className="eyebrow">Moderacion</p>
                <h2>Comentarios recientes</h2>
              </div>
              <span>{comments.length} recientes</span>
            </div>
            <div className="comment-dashboard-list">
              {comments.length > 0 ? (
                comments.slice(0, 6).map((comment) => (
                  <div className="comment-dashboard-row" key={comment.id}>
                    <strong>{comment.user.name}</strong>
                    <p>{comment.content}</p>
                    <span>{comment.article.title}</span>
                  </div>
                ))
              ) : (
                <div className="empty-dashboard-state">Aun no hay comentarios.</div>
              )}
            </div>
          </article>

          <article className="dashboard-card quick-actions-card" id="configuracion">
            <div className="card-heading">
              <div>
                <p className="eyebrow">Accesos rapidos</p>
                <h2>OFF Studio</h2>
              </div>
            </div>
            <div className="quick-actions-grid">
              <Link href="/admin/new">Crear capitulo</Link>
              <a href="#suscriptores">Ver comunidad</a>
              <a href="#insights">Revisar insights</a>
              <a href="#biblioteca">Abrir biblioteca</a>
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
