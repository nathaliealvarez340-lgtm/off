import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  MessageCircleMore,
  Sparkles,
} from "lucide-react";
import {
  assignArticleThemesAction,
  moderateEditorialReplyAction,
  saveEditorialConversationAction,
  saveOffIrlEventAction,
  saveRitualAction,
} from "@/app/actions";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { OFF_THEMES } from "@/lib/off-themes";
export const dynamic = "force-dynamic";
export default async function IntelligenceAdminPage() {
  await requireAdmin();
  const db = getDb();
  const [
    conversations,
    rituals,
    events,
    replies,
    articles,
    highlightCount,
    ritualParticipation,
  ] = await Promise.all([
    db.editorialConversation.findMany({
      orderBy: { updatedAt: "desc" },
      take: 30,
    }),
    db.ritual.findMany({ orderBy: { updatedAt: "desc" }, take: 30 }),
    db.offIrlEvent.findMany({ orderBy: { startAt: "desc" }, take: 30 }),
    db.editorialConversationReply.findMany({
      include: {
        user: { select: { name: true } },
        conversation: { select: { question: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    db.article.findMany({
      where: { status: "published" },
      select: { id: true, title: true, themes: true },
      orderBy: { publishedAt: "desc" },
    }),
    db.articleHighlight.count(),
    db.ritualResponse.count(),
  ]);
  return (
    <main className="admin-intelligence">
      <header>
        <Link href="/admin">
          <ArrowLeft />
          Dashboard
        </Link>
        <p>PERSONAL INTELLIGENCE LAYER</p>
        <h1>Herramientas editoriales</h1>
        <div>
          <span>
            {highlightCount}
            <small>subrayados agregados</small>
          </span>
          <span>
            {ritualParticipation}
            <small>participaciones en rituales</small>
          </span>
        </div>
      </header>
      <section>
        <h2>Temas de capítulos</h2>
        <AdminForm action={assignArticleThemesAction}>
          <select name="articleId" required>
            <option value="">Selecciona un capítulo</option>
            {articles.map((article) => (
              <option value={article.id} key={article.id}>
                {article.title}
                {article.themes.length ? ` · ${article.themes.join(", ")}` : ""}
              </option>
            ))}
          </select>
          <ThemeField />
          <button type="submit">Asignar temas</button>
        </AdminForm>
      </section>
      <section>
        <h2>
          <MessageCircleMore />
          Conversaciones OFF
        </h2>
        <AdminForm action={saveEditorialConversationAction}>
          <input name="internalTitle" placeholder="Título interno" required />
          <textarea name="question" placeholder="Pregunta principal" required />
          <textarea name="introduction" placeholder="Introducción breve" />
          <ThemeField />
          <input name="closesAt" type="datetime-local" />
          <label>
            <input name="featured" type="checkbox" />
            Destacar en Community
          </label>
          <StatusField />
        </AdminForm>
        {conversations.map((item) => (
          <article key={item.id}>
            <strong>{item.question}</strong>
            <span>
              {item.status} · {item.themes.join(" · ")}
            </span>
          </article>
        ))}
      </section>
      <section>
        <h2>
          <Sparkles />
          Rituales
        </h2>
        <AdminForm action={saveRitualAction}>
          <input name="title" placeholder="Título" required />
          <textarea name="prompt" placeholder="Pregunta del ritual" required />
          <ThemeField />
          <input name="activeFrom" type="datetime-local" required />
          <input name="activeUntil" type="datetime-local" required />
          <StatusField />
        </AdminForm>
        {rituals.map((item) => (
          <article key={item.id}>
            <strong>{item.prompt}</strong>
            <span>
              {item.status} · {item.themes.join(" · ")}
            </span>
          </article>
        ))}
      </section>
      <section>
        <h2>
          <CalendarDays />
          OFF IRL <em>Próximamente</em>
        </h2>
        <AdminForm action={saveOffIrlEventAction}>
          <input name="title" placeholder="Evento" required />
          <textarea name="description" placeholder="Descripción" required />
          <input name="locationName" placeholder="Lugar" />
          <input name="city" placeholder="Ciudad" />
          <input name="country" placeholder="País" />
          <input name="startAt" type="datetime-local" required />
          <input name="endAt" type="datetime-local" required />
          <input name="capacity" type="number" placeholder="Capacidad" />
          <input name="image" placeholder="URL de imagen" />
          <input name="externalMapUrl" placeholder="URL de mapa" />
          <select name="status">
            <option>DRAFT</option>
            <option>PUBLISHED</option>
            <option>CANCELLED</option>
            <option>COMPLETED</option>
          </select>
          <label>
            <input name="registrationOpen" type="checkbox" />
            Registro abierto
          </label>
          <button type="submit">Guardar evento</button>
        </AdminForm>
        {events.map((item) => (
          <article key={item.id}>
            <strong>{item.title}</strong>
            <span>
              {item.status} · {item.city ?? "Ubicación pendiente"}
            </span>
          </article>
        ))}
      </section>
      <section>
        <h2>Curaduría de respuestas</h2>
        {replies.map((reply) => (
          <article key={reply.id}>
            <div>
              <strong>{reply.user.name}</strong>
              <p>{reply.content}</p>
              <span>{reply.conversation.question}</span>
            </div>
            <form action={moderateEditorialReplyAction}>
              <input name="id" type="hidden" value={reply.id} />
              <button name="moderation" value="feature">
                Destacar
              </button>
              <button name="moderation" value="pin">
                Fijar
              </button>
              <button name="moderation" value="hide">
                Ocultar
              </button>
              <button name="moderation" value="delete">
                Eliminar
              </button>
            </form>
          </article>
        ))}
      </section>
    </main>
  );
}
function AdminForm({
  action,
  children,
}: {
  action: (formData: FormData) => Promise<void>;
  children: React.ReactNode;
}) {
  return (
    <form className="admin-intelligence-form" action={action}>
      {children}
    </form>
  );
}
function ThemeField() {
  return (
    <label>
      Temas editoriales
      <input name="themes" placeholder={OFF_THEMES.join(", ")} />
    </label>
  );
}
function StatusField() {
  return (
    <>
      <select name="status">
        <option value="draft">Draft</option>
        <option value="published">Published</option>
      </select>
      <button type="submit">Guardar</button>
    </>
  );
}
