import { ArrowLeft, EyeOff, ShieldCheck, Trash2 } from "lucide-react";
import Link from "next/link";
import { moderateSocialContentAction } from "@/app/actions";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminCommunityModerationPage() {
  await requireAdmin();
  const db = getDb();
  const [reports, posts, comments] = await Promise.all([
    db.socialReport.findMany({ where: { status: "pending" }, include: { reporter: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 50 }),
    db.communityPost.findMany({ include: { user: { select: { name: true } }, _count: { select: { likes: true, comments: true } } }, orderBy: { createdAt: "desc" }, take: 30 }),
    db.communityComment.findMany({ include: { user: { select: { name: true } }, post: { select: { content: true } } }, orderBy: { createdAt: "desc" }, take: 40 }),
  ]);
  const reportCount = new Map<string, number>();
  reports.forEach((report) => reportCount.set(`${report.targetType}:${report.targetId}`, (reportCount.get(`${report.targetType}:${report.targetId}`) ?? 0) + 1));

  return <main className="admin-social-moderation">
    <header><div><Link href="/admin"><ArrowLeft />Dashboard</Link><p>OFF SOCIAL LAYER</p><h1>Moderación de Community</h1><span>Contenido real, reportes abiertos y controles con validación ADMIN server-side.</span></div><ShieldCheck /></header>
    <section><h2>Reportes abiertos <span>{reports.length}</span></h2>{reports.length ? reports.map((report) => <article key={report.id}><div><strong>{report.targetType}</strong><small>{report.reporter.name} · {new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(report.createdAt)}</small><p>{report.reason || "Sin motivo adicional."}</p></div><code>{report.targetId}</code></article>) : <p>Sin reportes abiertos.</p>}</section>
    <section><h2>Pensamientos <span>{posts.length}</span></h2>{posts.map((post) => <article key={post.id}><div><strong>{post.user.name}</strong><small>{post.status} · {post._count.likes} likes · {post._count.comments} comentarios · {reportCount.get(`COMMUNITY_POST:${post.id}`) ?? 0} reportes</small><p>{post.content}</p></div><ModerationActions targetType="COMMUNITY_POST" targetId={post.id} /></article>)}</section>
    <section><h2>Comentarios y respuestas <span>{comments.length}</span></h2>{comments.map((comment) => <article key={comment.id}><div><strong>{comment.user.name}</strong><small>{comment.status} · {comment.parentId ? "Respuesta" : "Comentario"} · {reportCount.get(`COMMUNITY_COMMENT:${comment.id}`) ?? 0} reportes</small><p>{comment.content}</p><em>En: {comment.post.content.slice(0, 90)}</em></div><ModerationActions targetType="COMMUNITY_COMMENT" targetId={comment.id} /></article>)}</section>
  </main>;
}

function ModerationActions({ targetType, targetId }: { targetType: string; targetId: string }) {
  return <div className="admin-social-actions"><form action={moderateSocialContentAction}><input type="hidden" name="targetType" value={targetType} /><input type="hidden" name="targetId" value={targetId} /><input type="hidden" name="mode" value="hide" /><button type="submit"><EyeOff />Ocultar</button></form><form action={moderateSocialContentAction}><input type="hidden" name="targetType" value={targetType} /><input type="hidden" name="targetId" value={targetId} /><input type="hidden" name="mode" value="delete" /><button type="submit"><Trash2 />Eliminar</button></form></div>;
}
