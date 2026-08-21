import Link from "next/link";
import { ArchiveRestore, BookOpen, Clock3, Plus, Radio, StickyNote } from "lucide-react";
import { unstable_noStore as noStore } from "next/cache";
import { logoutAction } from "@/app/actions";
import { AdminCommunityManager, type CommunityMember } from "@/components/AdminCommunityManager";
import { AdminEditorialTable } from "@/components/AdminEditorialTable";
import { AdminGreeting } from "@/components/AdminGreeting";
import { AdminSessionGuard } from "@/components/AdminSessionGuard";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { formatDate, getAllArticles, getPlainTextPreview, isInternalContentCategory } from "@/lib/articles";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";

function formatCount(value: number) {
  if (value >= 1000) return new Intl.NumberFormat("es-MX", { notation: "compact" }).format(value);
  return String(value);
}

const loungeTypeLabels = {
  LIBRARY: "Biblioteca",
  SIGNAL: "Signal",
  RESOURCE: "Recurso desbloqueado",
  NATHALIE_NOTE: "Nota de Nathalie",
  EARLY_ACCESS: "Early Access",
} as const;

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ deleted?: string; loungeDeleted?: string }> }) {
  noStore();
  const currentAdmin = await requireAdmin();

  const { deleted, loungeDeleted } = await searchParams;
  const db = getDb();
  const [articles, loungeContent, users, subscribers, subscriberCount, commentCount, comments, topicSuggestions] = await Promise.all([
    getAllArticles(),
    db.loungeContent.findMany({ orderBy: { updatedAt: "desc" } }),
    db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        preferredLanguage: true,
        createdAt: true,
        memberProfile: { select: { memberNumber: true } },
        activity: { select: { updatedAt: true } },
        sessions: { select: { createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 },
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
        consent: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
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

  const editorialArticles = articles.filter((article) => !isInternalContentCategory(article.category));
  const subscribersByEmail = new Map(subscribers.map((subscriber) => [subscriber.email.trim().toLowerCase(), subscriber]));
  const userEmails = new Set(users.map((user) => user.email.trim().toLowerCase()));
  const communityMembers: CommunityMember[] = [
    ...users.map((user) => {
      const subscriber = subscribersByEmail.get(user.email.trim().toLowerCase());
      const lastActivity = [user.activity?.updatedAt, user.sessions[0]?.createdAt]
        .filter((value): value is Date => Boolean(value))
        .sort((a, b) => b.getTime() - a.getTime())[0];

      return {
        id: user.id,
        kind: "user" as const,
        userId: user.id,
        name: user.name,
        email: user.email,
        offId: user.memberProfile ? `#${String(user.memberProfile.memberNumber).padStart(4, "0")}` : null,
        createdAt: user.createdAt.toISOString(),
        preferredLanguage: user.preferredLanguage,
        role: user.role,
        status: subscriber?.consent ? "Activo · Suscrito" : "Cuenta activa",
        interest: subscriber?.interest ?? null,
        commentCount: user._count.comments,
        lastActivity: lastActivity?.toISOString() ?? null,
        isCurrentAdmin: user.id === currentAdmin.id,
      };
    }),
    ...subscribers
      .filter((subscriber) => !userEmails.has(subscriber.email.trim().toLowerCase()))
      .map((subscriber) => ({
        id: subscriber.id,
        kind: "subscriber" as const,
        userId: null,
        name: subscriber.name,
        email: subscriber.email,
        offId: null,
        createdAt: subscriber.createdAt.toISOString(),
        preferredLanguage: null,
        role: null,
        status: subscriber.consent ? "Suscriptor activo" : "Consentimiento pendiente",
        interest: subscriber.interest,
        commentCount: 0,
        lastActivity: null,
        isCurrentAdmin: false,
      })),
  ];
  const articleTitlesById = new Map(articles.map((article) => [article.id, getPlainTextPreview(article.title, 120)]));
  const publishedArticles = editorialArticles.filter((article) => article.status === "published");
  const draftArticles = editorialArticles.filter((article) => article.status !== "published");
  const recentActivities = [
    ...users.slice(0, 3).map((user) => ({
      label: "Nuevo registro",
      labelKey: "newRegistration",
      title: user.name,
      detail: user.email,
      date: formatDate(user.createdAt),
    })),
    ...subscribers.slice(0, 3).map((subscriber) => ({
      label: "Suscripcion",
      labelKey: "subscription",
      title: subscriber.name,
      detail: subscriber.interest,
      date: formatDate(subscriber.createdAt),
    })),
    ...comments.slice(0, 3).map((comment) => ({
      label: "Comentario",
      labelKey: "comment",
      title: comment.user.name,
      detail: getPlainTextPreview(comment.article.title, 120),
      date: formatDate(comment.createdAt),
    })),
    ...publishedArticles.slice(0, 3).map((article) => ({
      label: "Articulo publicado",
      labelKey: "articlePublished",
      title: getPlainTextPreview(article.title, 120),
      detail: article.category,
      date: formatDate(article.publishedAt),
    })),
  ].slice(0, 7);

  const metrics = [
    {
      label: "Usuarios registrados",
      labelKey: "usersRegistered",
      value: formatCount(users.length),
      note: users.length > 0 ? "datos reales" : "Sin datos todavia",
      noteKey: users.length > 0 ? "realData" : "noDataYet",
      icon: "01",
    },
    {
      label: "Nuevos suscriptores",
      labelKey: "newSubscribers",
      value: formatCount(subscriberCount),
      note: subscriberCount > 0 ? "datos reales" : "Aun no hay suscriptores",
      noteKey: subscriberCount > 0 ? "realData" : "noSubscribersYet",
      icon: "02",
    },
    {
      label: "Articulos publicados",
      labelKey: "publishedArticles",
      value: formatCount(publishedArticles.length),
      note: publishedArticles.length > 0 ? "datos reales" : "Publica tu primer articulo",
      noteKey: publishedArticles.length > 0 ? "realData" : "publishFirstArticle",
      icon: "03",
    },
    {
      label: "Comentarios",
      labelKey: "comments",
      value: formatCount(commentCount),
      note: commentCount > 0 ? "datos reales" : "Aun no hay comentarios",
      noteKey: commentCount > 0 ? "realData" : "noCommentsYet",
      icon: "04",
    },
    {
      label: "Articulos guardados",
      labelKey: "savedArticles",
      value: "-",
      note: "Sin tracking todavia",
      noteKey: "noTrackingYet",
      icon: "05",
    },
  ];

  return (
    <main className="admin-page admin-dashboard">
      <AdminSessionGuard />
      <aside className="admin-sidebar">
        <Link href="/admin" className="admin-logo admin-brand-lockup" aria-label="OFF admin">
          <img src="/logo/logo-off.png" alt="OFF" />
          <img src="/logo/maia-logo-white.png" alt="MAIA" />
        </Link>

        <nav className="admin-side-nav" aria-label="Navegacion admin">
          <a className="active" href="#dashboard" data-i18n="adminDashboard">Dashboard</a>
          <a href="#articulos" data-i18n="adminArticles">Articulos</a>
          <a href="#biblioteca" data-i18n="visualLibrary">Biblioteca visual</a>
          <a href="#suscriptores" data-i18n="subscribers">Suscriptores</a>
          <a href="#insights" data-i18n="insights">Insights</a>
          <a href="#comentarios" data-i18n="comments">Comentarios</a>
          <a href="#temas" data-i18n="nextTopics">Proximos temas</a>
          <a href="#actividad" data-i18n="offActivities">Actividades OFF</a>
          <a href="#configuracion" data-i18n="settings">Configuracion</a>
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
            <button type="submit" aria-label="Salir" data-i18n="exit">Salir</button>
          </form>
        </div>
      </aside>

      <section className="admin-main" id="dashboard">
        {deleted ? (
          <div className={deleted === "1" ? "admin-flash success" : "admin-flash error"}>
            {deleted === "1" ? "Articulo eliminado correctamente." : "No pudimos eliminar ese articulo."}
          </div>
        ) : null}
        {loungeDeleted ? <div className="admin-flash success">Contenido del Lounge eliminado correctamente.</div> : null}

        <header className="admin-topbar">
          <div>
            <p className="eyebrow" data-i18n="offAdmin">OFF Admin</p>
            <AdminGreeting />
            <p data-i18n="adminSubtitle">Las personas no buscan contenido. Buscan sentirse entendidas.</p>
          </div>
          <div className="admin-top-actions">
            <LanguageSwitcher compact />
            <Link className="admin-create-circle" href="/admin/new" data-i18n-title="newArticle" data-i18n-aria-label="newArticle" title="Nuevo articulo" aria-label="Nuevo articulo"><Plus /></Link>
            <Link className="admin-create-circle" href="/admin/lounge/new?type=LIBRARY" data-i18n-title="newLibrary" data-i18n-aria-label="newLibrary" title="Nueva biblioteca" aria-label="Nueva biblioteca"><BookOpen /></Link>
            <Link className="admin-create-circle" href="/admin/lounge/new?type=SIGNAL" data-i18n-title="newSignal" data-i18n-aria-label="newSignal" title="Nuevo Signal" aria-label="Nuevo Signal"><Radio /></Link>
            <Link className="admin-create-circle" href="/admin/lounge/new?type=RESOURCE" data-i18n-title="newResource" data-i18n-aria-label="newResource" title="Nuevo recurso desbloqueado" aria-label="Nuevo recurso desbloqueado"><ArchiveRestore /></Link>
            <Link className="admin-create-circle" href="/admin/lounge/new?type=NATHALIE_NOTE" data-i18n-title="newNathalieNote" data-i18n-aria-label="newNathalieNote" title="Nueva nota de Nathalie" aria-label="Nueva nota de Nathalie"><StickyNote /></Link>
            <Link className="admin-create-circle" href="/admin/lounge/new?type=EARLY_ACCESS" data-i18n-title="newEarlyAccess" data-i18n-aria-label="newEarlyAccess" title="Nuevo early access" aria-label="Nuevo early access"><Clock3 /></Link>
          </div>
        </header>

        <section className="metrics-grid" aria-label="Metricas principales">
          {metrics.map((metric) => (
            <article className="metric-card" key={metric.label}>
              <div className="metric-card-head">
                <span>{metric.icon}</span>
                <em data-i18n={metric.noteKey}>{metric.note}</em>
              </div>
              <strong>{metric.value}</strong>
              <p data-i18n={metric.labelKey}>{metric.label}</p>
            </article>
          ))}
        </section>

        <section className="dashboard-grid">
          <article className="dashboard-card activity-card" id="actividad">
            <div className="card-heading">
              <div>
                <p className="eyebrow" data-i18n="live">En vivo</p>
                <h2 data-i18n="recentActivity">Actividad reciente</h2>
              </div>
              <span>{recentActivities.length} <span data-i18n="movements">movimientos</span></span>
            </div>

            <div className="activity-timeline">
              {recentActivities.length > 0 ? (
                recentActivities.map((activity, index) => (
                  <div className="activity-item" key={`${activity.label}-${activity.title}-${index}`}>
                    <span className="activity-dot" />
                    <div>
                      <small data-i18n={activity.labelKey}>{activity.label}</small>
                      <strong>{activity.title}</strong>
                      <p>{activity.detail}</p>
                    </div>
                    <time>{activity.date}</time>
                  </div>
                ))
              ) : (
                <div className="empty-dashboard-state" data-i18n="publishFirstArticle">
                  Publica tu primer articulo para comenzar a medir movimiento real.
                </div>
              )}
            </div>
          </article>

          <article className="dashboard-card insights-card" id="insights">
            <div className="card-heading">
              <div>
                <p className="eyebrow" data-i18n="emotionalReading">Lectura emocional</p>
                <h2 data-i18n="mostReadTopics">Temas mas leidos</h2>
              </div>
            </div>

            <div className="scatter-plot empty-scatter" aria-label="Grafica de dispersion emocional sin datos suficientes">
              <span className="scatter-axis-x" />
              <span className="scatter-axis-y" />
              <span className="scatter-label top" data-i18n="interaction">Interaccion</span>
              <span className="scatter-label bottom" data-i18n="realReading">Lectura real</span>
            </div>

            <div className="topic-list">
              <div className="empty-dashboard-state" data-i18n="noReadingData">Aun no hay suficientes datos de lectura para generar dispersion emocional.</div>
            </div>
            <p className="insight-note" data-i18n="insightPending">La grafica se activara cuando exista tracking real de lecturas, vistas o guardados.</p>
          </article>
        </section>

        <section className="dashboard-card articles-dashboard-card" id="articulos">
          <div className="card-heading">
            <div>
              <p className="eyebrow" data-i18n="editorialArchive">Archivo editorial</p>
              <h2 data-i18n="latestArticles">Ultimos articulos</h2>
            </div>
            <div className="article-status-pills">
              <span>{publishedArticles.length} <span data-i18n="published">publicados</span></span>
              <span>{draftArticles.length} drafts</span>
            </div>
          </div>

          <AdminEditorialTable articles={editorialArticles} />
        </section>

        <section className="dashboard-card articles-dashboard-card" id="contenido-lounge">
          <div className="card-heading">
            <div>
              <p className="eyebrow" data-i18n="memberLounge">Member Lounge</p>
              <h2 data-i18n="privateContent">Contenido privado</h2>
            </div>
            <span>{loungeContent.length} <span data-i18n="pieces">piezas</span></span>
          </div>
          <div className="admin-article-list">
            {loungeContent.length ? loungeContent.map((item) => (
              <article className="admin-article-item lounge-content-admin-item" key={item.id}>
                <div className="lounge-content-type-mark">{loungeTypeLabels[item.type].slice(0, 2).toUpperCase()}</div>
                <div>
                  <div className="article-mini-meta"><span>{loungeTypeLabels[item.type]}</span><span>{item.status}</span></div>
                  <h3>{getPlainTextPreview(item.title, 150)}</h3>
                  <p>{getPlainTextPreview(item.description ?? item.content ?? "")}</p>
                  {item.relatedArticle ? <small>Origen: {articleTitlesById.get(item.relatedArticle) ?? "Articulo publicado"}</small> : <small>Creacion manual</small>}
                </div>
                <div className="article-actions">
                  <Link className="button" href={`/admin/lounge/${item.id}`} data-i18n="edit">Editar</Link>
                </div>
              </article>
            )) : <div className="empty-dashboard-state">Crea contenido del Lounge desde las acciones circulares superiores.</div>}
          </div>
        </section>

        <section className="dashboard-grid lower-grid">
          <article className="dashboard-card subscribers-card" id="suscriptores">
            <div className="card-heading">
              <div>
                <p className="eyebrow" data-i18n="community">Comunidad</p>
                <h2 data-i18n="subscribers">Suscriptores</h2>
              </div>
              <span>{communityMembers.length} <span data-i18n="records">registros</span></span>
            </div>
            <AdminCommunityManager members={communityMembers} />
          </article>

          <article className="dashboard-card visual-library-card" id="biblioteca">
            <div className="card-heading">
              <div>
                <p className="eyebrow" data-i18n="visualMood">Mood visual</p>
                <h2 data-i18n="visualLibrary">Biblioteca visual</h2>
              </div>
            </div>
            <div className="visual-preview">
              <img src="/images/image1.webp" alt="" />
              <div>
                <span data-i18n="activeReference">Referencia activa</span>
                <strong data-i18n="visualReferenceCopy">Silencio, tension y claridad emocional.</strong>
              </div>
            </div>
          </article>
        </section>

        <section className="dashboard-grid lower-grid">
          <article className="dashboard-card comments-dashboard-card" id="comentarios">
            <div className="card-heading">
              <div>
                <p className="eyebrow" data-i18n="moderation">Moderacion</p>
                <h2 data-i18n="recentComments">Comentarios recientes</h2>
              </div>
              <span>{commentCount} <span data-i18n="comments">comentarios</span></span>
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
                <div className="empty-dashboard-state" data-i18n="noCommentsYet">Aun no hay comentarios.</div>
              )}
            </div>
          </article>

          <article className="dashboard-card comments-dashboard-card" id="temas">
            <div className="card-heading">
              <div>
                <p className="eyebrow" data-i18n="nextChapter">Proximo capitulo</p>
                <h2 data-i18n="suggestedTopics">Temas sugeridos</h2>
              </div>
              <span>{topicSuggestions.length} <span data-i18n="responses">respuestas</span></span>
            </div>
            <div className="comment-dashboard-list">
              {topicSuggestions.length > 0 ? (
                topicSuggestions.map((suggestion) => (
                  <div className="comment-dashboard-row" key={suggestion.id}>
                    <strong>{suggestion.user.name}</strong>
                    <span>{suggestion.user.email}</span>
                    <p>{suggestion.content}</p>
                    <span>{suggestion.article ? getPlainTextPreview(suggestion.article.title, 120) : "Sin articulo origen"} - {formatDate(suggestion.createdAt)}</span>
                  </div>
                ))
              ) : (
                <div className="empty-dashboard-state">Aun no hay respuestas para proximos capitulos.</div>
              )}
            </div>
          </article>

          <article className="dashboard-card quick-actions-card" id="configuracion">
            <div className="card-heading">
              <div>
                <p className="eyebrow" data-i18n="quickActions">Accesos rapidos</p>
                <h2>OFF Studio</h2>
              </div>
            </div>
            <div className="quick-actions-grid">
              <Link href="/admin/new" data-i18n="createChapter">Crear capitulo</Link>
              <a href="/admin#suscriptores" data-i18n="viewCommunity">Ver comunidad</a>
              <a href="/admin#insights" data-i18n="reviewInsights">Revisar insights</a>
              <a href="/admin#biblioteca" data-i18n="openLibrary">Abrir biblioteca</a>
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
