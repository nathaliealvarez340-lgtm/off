import Link from "next/link";
import { ArchiveRestore, BookOpen, Clock3, Plus, StickyNote } from "lucide-react";
import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/actions";
import { AdminGreeting } from "@/components/AdminGreeting";
import { AdminSessionGuard } from "@/components/AdminSessionGuard";
import { AdminSidebarToggle } from "@/components/AdminSidebarToggle";
import { DeleteArticleButton } from "@/components/DeleteArticleButton";
import { formatDate, getAllArticles, getPlainTextPreview, isInternalContentCategory } from "@/lib/articles";
import { isAdminSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

function formatCount(value: number) {
  if (value >= 1000) return new Intl.NumberFormat("es-MX", { notation: "compact" }).format(value);
  return String(value);
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  noStore();
  if (!(await isAdminSession())) {
    redirect("/login");
  }

  const { deleted } = await searchParams;
  const db = getDb();
  const [articles, users, subscribers, subscriberCount, commentCount, comments, topicSuggestions] = await Promise.all([
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
    db.topicSuggestion.findMany({
      include: {
        user: { select: { name: true, email: true } },
        article: { select: { title: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const internalArticles = articles.filter((article) => isInternalContentCategory(article.category));
  const editorialArticles = articles.filter((article) => !isInternalContentCategory(article.category));
  const publishedArticles = editorialArticles.filter((article) => article.status === "published");
  const draftArticles = editorialArticles.filter((article) => article.status !== "published");
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
      detail: getPlainTextPreview(comment.article.title, 120),
      date: formatDate(comment.createdAt),
    })),
    ...publishedArticles.slice(0, 3).map((article) => ({
      label: "Articulo publicado",
      title: getPlainTextPreview(article.title, 120),
      detail: article.category,
      date: formatDate(article.publishedAt),
    })),
  ].slice(0, 7);

  const metrics = [
    {
      label: "Usuarios registrados",
      value: formatCount(users.length),
      note: users.length > 0 ? "datos reales" : "Sin datos todavia",
      icon: "01",
    },
    {
      label: "Nuevos suscriptores",
      value: formatCount(subscriberCount),
      note: subscriberCount > 0 ? "datos reales" : "Aun no hay suscriptores",
      icon: "02",
    },
    {
      label: "Articulos publicados",
      value: formatCount(publishedArticles.length),
      note: publishedArticles.length > 0 ? "datos reales" : "Publica tu primer articulo",
      icon: "03",
    },
    {
      label: "Comentarios",
      value: formatCount(commentCount),
      note: commentCount > 0 ? "datos reales" : "Aun no hay comentarios",
      icon: "04",
    },
    {
      label: "Articulos guardados",
      value: "-",
      note: "Sin tracking todavia",
      icon: "05",
    },
  ];

  return (
    <main className="admin-page admin-dashboard">
      <AdminSessionGuard />
      <aside className="admin-sidebar">
        <AdminSidebarToggle />
        <Link href="/admin" className="admin-logo admin-brand-lockup" aria-label="OFF admin">
          <img src="/logo/logo-off.png" alt="OFF" />
          <img src="/logo/maia-logo-white.png" alt="MAIA" />
        </Link>

        <nav className="admin-side-nav" aria-label="Navegacion admin">
          <a className="active" href="#dashboard">Dashboard</a>
          <a href="#articulos">Articulos</a>
          <a href="#biblioteca">Biblioteca visual</a>
          <a href="#suscriptores">Suscriptores</a>
          <a href="#insights">Insights</a>
          <a href="#comentarios">Comentarios</a>
          <a href="#temas">Próximos temas</a>
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
        {deleted ? (
          <div className={deleted === "1" ? "admin-flash success" : "admin-flash error"}>
            {deleted === "1" ? "Articulo eliminado correctamente." : "No pudimos eliminar ese articulo."}
          </div>
        ) : null}

        <header className="admin-topbar">
          <div>
            <p className="eyebrow">OFF Admin</p>
            <AdminGreeting />
            <p>Las personas no buscan contenido. Buscan sentirse entendidas.</p>
          </div>
          <div className="admin-top-actions">
            <Link className="admin-create-circle" href="/admin/new" title="Nuevo artículo" aria-label="Nuevo artículo"><Plus /></Link>
            <Link className="admin-create-circle" href="/admin/new?category=Biblioteca%20curada" title="Nueva biblioteca curada" aria-label="Nueva biblioteca curada"><BookOpen /></Link>
            <Link className="admin-create-circle" href="/admin/new?category=Nota%20privada" title="Nueva nota privada" aria-label="Nueva nota privada"><StickyNote /></Link>
            <Link className="admin-create-circle" href="/admin/new?category=Archivo%20desbloqueado" title="Nuevo archivo desbloqueado" aria-label="Nuevo archivo desbloqueado"><ArchiveRestore /></Link>
            <Link className="admin-create-circle" href="/admin/new?category=Early%20Access" title="Nuevo early access" aria-label="Nuevo early access"><Clock3 /></Link>
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
                  Aun no hay actividad. Publica tu primer articulo para comenzar a medir movimiento real.
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

            <div className="scatter-plot empty-scatter" aria-label="Grafica de dispersion emocional sin datos suficientes">
              <span className="scatter-axis-x" />
              <span className="scatter-axis-y" />
              <span className="scatter-label top">Interaccion</span>
              <span className="scatter-label bottom">Lectura real</span>
            </div>

            <div className="topic-list">
              <div className="empty-dashboard-state">Aun no hay suficientes datos de lectura para generar dispersion emocional.</div>
            </div>
            <p className="insight-note">La grafica se activara cuando exista tracking real de lecturas, vistas o guardados.</p>
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
            {editorialArticles.length > 0 ? (
              editorialArticles.slice(0, 8).map((article) => (
                <article className="admin-article-item" key={article.id}>
                  <img src={article.coverImage} alt="" />
                  <div>
                    <div className="article-mini-meta">
                      <span>{article.category}</span>
                      <span>{formatDate(article.publishedAt)}</span>
                      <span>{article.readTime}</span>
                      {article.featured ? <span className="featured-pill">Destacado</span> : null}
                    </div>
                    <h3>{getPlainTextPreview(article.title, 150)}</h3>
                    <p>{getPlainTextPreview(article.excerpt)}</p>
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
                    <DeleteArticleButton articleId={article.id} compact />
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-dashboard-state">Todavia no hay articulos. Crea el primer capitulo desde Nuevo articulo.</div>
            )}
          </div>
        </section>

        <section className="dashboard-card articles-dashboard-card" id="contenido-lounge">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Member Lounge</p>
              <h2>Contenido privado</h2>
            </div>
            <span>{internalArticles.length} piezas</span>
          </div>
          <div className="admin-article-list">
            {internalArticles.length ? internalArticles.map((article) => (
              <article className="admin-article-item" key={article.id}>
                <img src={article.coverImage} alt="" />
                <div>
                  <div className="article-mini-meta"><span>{article.category}</span><span>{article.status}</span></div>
                  <h3>{getPlainTextPreview(article.title, 150)}</h3>
                  <p>{getPlainTextPreview(article.excerpt)}</p>
                </div>
                <div className="article-actions">
                  <Link className="button" href={`/admin/${article.id}`}>Editar</Link>
                  <DeleteArticleButton articleId={article.id} compact />
                </div>
              </article>
            )) : <div className="empty-dashboard-state">Crea contenido privado desde las acciones circulares superiores.</div>}
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
                <div className="empty-dashboard-state">Aun no hay suscriptores ni usuarios registrados.</div>
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
                    <span>{getPlainTextPreview(comment.article.title, 120)}</span>
                  </div>
                ))
              ) : (
                <div className="empty-dashboard-state">Aun no hay comentarios.</div>
              )}
            </div>
          </article>

          <article className="dashboard-card comments-dashboard-card" id="temas">
            <div className="card-heading">
              <div>
                <p className="eyebrow">Próximo capítulo</p>
                <h2>Temas sugeridos</h2>
              </div>
              <span>{topicSuggestions.length} respuestas</span>
            </div>
            <div className="comment-dashboard-list">
              {topicSuggestions.length > 0 ? (
                topicSuggestions.map((suggestion) => (
                  <div className="comment-dashboard-row" key={suggestion.id}>
                    <strong>{suggestion.user.name}</strong>
                    <span>{suggestion.user.email}</span>
                    <p>{suggestion.content}</p>
                    <span>{suggestion.article ? getPlainTextPreview(suggestion.article.title, 120) : "Sin artículo origen"} · {formatDate(suggestion.createdAt)}</span>
                  </div>
                ))
              ) : (
                <div className="empty-dashboard-state">Aún no hay respuestas para próximos capítulos.</div>
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
              <a href="/admin#suscriptores">Ver comunidad</a>
              <a href="/admin#insights">Revisar insights</a>
              <a href="/admin#biblioteca">Abrir biblioteca</a>
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
