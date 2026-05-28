import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/actions";
import { AdminGreeting } from "@/components/AdminGreeting";
import { formatDate, getAllArticles } from "@/lib/articles";
import { isAdminSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

function formatCount(value: number) {
  if (value >= 1000) return new Intl.NumberFormat("es-MX", { notation: "compact" }).format(value);
  return String(value);
}

export default async function AdminPage() {
  if (!(await isAdminSession())) {
    redirect("/login");
  }

  const db = getDb();
  const [articles, users, subscribers, subscriberCount, commentCount, comments] = await Promise.all([
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
    db.subscriber.count(),
    db.comment.count(),
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
    ...publishedArticles.slice(0, 3).map((article) => ({
      label: "Articulo publicado",
      title: article.title,
      detail: article.category,
      date: formatDate(article.publishedAt),
    })),
  ].slice(0, 7);

  const metrics = [
    {
      label: "Usuarios registrados",
      value: formatCount(users.length),
      note: users.length > 0 ? "datos reales" : "Sin datos todavía",
      icon: "01",
    },
    {
      label: "Nuevos suscriptores",
      value: formatCount(subscriberCount),
      note: subscriberCount > 0 ? "datos reales" : "Aún no hay suscriptores",
      icon: "02",
    },
    {
      label: "Articulos publicados",
      value: formatCount(publishedArticles.length),
      note: publishedArticles.length > 0 ? "datos reales" : "Publica tu primer artículo",
      icon: "03",
    },
    {
      label: "Comentarios",
      value: formatCount(commentCount),
      note: commentCount > 0 ? "datos reales" : "Aún no hay comentarios",
      icon: "04",
    },
    {
      label: "Articulos guardados",
      value: "—",
      note: "Sin tracking todavía",
      icon: "05",
    },
  ];

  const categoryCounts = publishedArticles.reduce<Record<string, number>>((acc, article) => {
    acc[article.category] = (acc[article.category] ?? 0) + 1;
    return acc;
  }, {});
  const maxCategoryCount = Math.max(0, ...Object.values(categoryCounts));
  const topics = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic, count]) => [topic, maxCategoryCount > 0 ? Math.round((count / maxCategoryCount) * 100) : 0, count] as const);

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
            <AdminGreeting />
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
                <em>{metric.note}</em>
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
              <span>{recentActivities.length} movimientos</span>
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
                  Aún no hay actividad. Publica tu primer artículo para comenzar a medir movimiento real.
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

            <div className={topics.length > 0 ? "radar-wrap" : "radar-wrap empty-radar"} aria-hidden="true">
              <div className="radar-orbit orbit-one" />
              <div className="radar-orbit orbit-two" />
              <div className="radar-orbit orbit-three" />
              <div className="radar-shape" />
            </div>

            <div className="topic-list">
              {topics.length > 0 ? (
                topics.map(([topic, score, count]) => (
                  <div className="topic-row" key={topic}>
                    <span>{topic}</span>
                    <div>
                      <i style={{ width: `${score}%` }} />
                    </div>
                    <em>{count} articulos</em>
                  </div>
                ))
              ) : (
                <div className="empty-dashboard-state">Aún no hay suficientes datos para generar insights.</div>
              )}
            </div>
            <p className="insight-note">
              {topics.length > 0 ? "Insights basados en categorías de artículos publicados." : "La gráfica está lista; aparecerá cuando existan datos reales."}
            </p>
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
              articles.slice(0, 8).map((article) => (
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
                      <span>Lecturas: sin tracking</span>
                      <span>Guardados: sin tracking</span>
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
              <div className="empty-dashboard-state">Todavía no hay artículos. Crea el primer capítulo desde Nuevo artículo.</div>
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
              <span>{users.length + subscriberCount} registros</span>
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
              {users.length + subscriberCount === 0 ? (
                <div className="empty-dashboard-state">Aún no hay suscriptores ni usuarios registrados.</div>
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
              <span>{commentCount} comentarios</span>
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
                <div className="empty-dashboard-state">Aún no hay comentarios.</div>
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
