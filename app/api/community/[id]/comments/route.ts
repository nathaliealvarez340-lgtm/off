import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { cleanSocialText, COMMUNITY_COMMENT_LIMIT, memberOffId } from "@/lib/community";
import { getDb } from "@/lib/db";
import { consumeRateLimit } from "@/lib/rate-limit";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
  const { id } = await params;
  const url = new URL(request.url);
  const parentId = url.searchParams.get("parentId");
  const offset = Math.max(0, Number.parseInt(url.searchParams.get("offset") ?? "0", 10) || 0);
  const comments = await getDb().communityComment.findMany({
    where: { postId: id, status: "PUBLISHED", parentId: parentId || null },
    include: { user: { select: { id: true, name: true, memberProfile: { select: { memberNumber: true } } } }, likes: { where: { userId: user.id }, select: { userId: true } }, _count: { select: { likes: true, replies: true } } },
    orderBy: { createdAt: parentId ? "asc" : "desc" },
    skip: offset,
    take: 4,
  });
  return NextResponse.json({ success: true, comments: comments.map((comment) => ({ id: comment.id, parentId: comment.parentId, content: comment.content, createdAt: comment.createdAt.toISOString(), user: { id: comment.user.id, name: comment.user.name, offId: memberOffId(comment.user.memberProfile?.memberNumber) }, likeCount: comment._count.likes, likedByViewer: comment.likes.length > 0, canDelete: user.role === "ADMIN" || comment.userId === user.id, replyCount: comment._count.replies, replies: [] })), hasMore: comments.length === 4 });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
  if (!await consumeRateLimit("community-comment", user.id, 10, 60_000)) return NextResponse.json({ success: false, error: "Has enviado varios comentarios. Espera un momento." }, { status: 429 });
  const { id } = await params;
  const body = await request.json().catch(() => null) as { content?: unknown; parentId?: unknown } | null;
  const content = cleanSocialText(body?.content, COMMUNITY_COMMENT_LIMIT);
  const requestedParentId = typeof body?.parentId === "string" ? body.parentId : null;
  if (content.length < 2) return NextResponse.json({ success: false, error: "Escribe una respuesta." }, { status: 400 });
  const db = getDb();
  const post = await db.communityPost.findFirst({ where: { id, status: "published" }, select: { id: true } });
  if (!post) return NextResponse.json({ success: false, error: "Publicación no encontrada." }, { status: 404 });
  const parent = requestedParentId ? await db.communityComment.findFirst({ where: { id: requestedParentId, postId: id }, select: { id: true, parentId: true, userId: true } }) : null;
  if (requestedParentId && !parent) return NextResponse.json({ success: false, error: "El comentario al que respondes ya no existe." }, { status: 404 });
  const parentId = parent?.parentId ?? parent?.id ?? null;
  const comment = await db.communityComment.create({ data: { postId: id, userId: user.id, parentId, content }, include: { user: { select: { id: true, name: true, memberProfile: { select: { memberNumber: true } } } } } });
  if (parent && parent.userId !== user.id) await db.notification.create({ data: { userId: parent.userId, type: "COMMUNITY_REPLY", title: "Nueva respuesta", message: `${user.name} respondió a tu comentario.`, href: `/lounge/community#comment-${comment.id}` } });
  return NextResponse.json({ success: true, comment: { id: comment.id, parentId: comment.parentId, content: comment.content, createdAt: comment.createdAt.toISOString(), user: { id: comment.user.id, name: comment.user.name, offId: memberOffId(comment.user.memberProfile?.memberNumber) }, likeCount: 0, likedByViewer: false, canDelete: true, replyCount: 0, replies: [] } });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => null) as { commentId?: unknown; hide?: unknown } | null;
  const commentId = typeof body?.commentId === "string" ? body.commentId : "";
  const comment = commentId ? await getDb().communityComment.findFirst({ where: { id: commentId, postId: id }, select: { id: true, userId: true } }) : null;
  if (!comment) return NextResponse.json({ success: false, error: "Comentario no encontrado." }, { status: 404 });
  if (user.role !== "ADMIN" && comment.userId !== user.id) return NextResponse.json({ success: false, error: "No puedes eliminar este comentario." }, { status: 403 });
  if (user.role === "ADMIN" && body?.hide === true) await getDb().communityComment.update({ where: { id: comment.id }, data: { status: "PENDING" } });
  else await getDb().communityComment.delete({ where: { id: comment.id } });
  return NextResponse.json({ success: true });
}
