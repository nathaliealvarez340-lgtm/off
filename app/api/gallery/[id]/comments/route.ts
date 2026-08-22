import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { consumeRateLimit } from "@/lib/rate-limit";

function cleanComment(value: unknown) {
  return typeof value === "string" ? value.replace(/<[^>]*>/g, "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, 1000) : "";
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
  const { id } = await params;
  const url = new URL(request.url);
  const parentId = url.searchParams.get("parentId");
  const offset = Math.max(0, Number.parseInt(url.searchParams.get("offset") ?? "0", 10) || 0);
  if (parentId) {
    const replies = await getDb().galleryPostComment.findMany({
      where: { postId: id, parentId, status: "PUBLISHED", post: { status: "published" } },
      include: { user: { select: { id: true, name: true, memberProfile: { select: { memberNumber: true } } } } },
      orderBy: { createdAt: "asc" },
      skip: offset,
      take: 4,
    });
    return NextResponse.json({ success: true, comments: replies.map((reply) => ({ id: reply.id, parentId: reply.parentId, content: reply.content, createdAt: reply.createdAt.toISOString(), user: { id: reply.user.id, name: reply.user.name, offId: reply.user.memberProfile?.memberNumber ? `OFF #${String(reply.user.memberProfile.memberNumber).padStart(4, "0")}` : "OFF Member" }, likeCount: 0, likedByViewer: false, canDelete: user.role === "ADMIN" || reply.userId === user.id, replyCount: 0, replies: [] })), hasMore: replies.length === 4 });
  }
  const comments = await getDb().galleryPostComment.findMany({
    where: { postId: id, status: "PUBLISHED", parentId: null, post: { status: "published" } },
    include: {
      user: { select: { id: true, name: true, memberProfile: { select: { memberNumber: true } } } },
      _count: { select: { replies: true } },
      replies: { where: { status: "PUBLISHED" }, include: { user: { select: { id: true, name: true, memberProfile: { select: { memberNumber: true } } } } }, orderBy: { createdAt: "asc" }, take: 3 },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ success: true, comments: comments.map((comment) => ({
    id: comment.id,
    parentId: null,
    content: comment.content,
    createdAt: comment.createdAt.toISOString(),
    user: { id: comment.user.id, name: comment.user.name, offId: comment.user.memberProfile?.memberNumber ? `OFF #${String(comment.user.memberProfile.memberNumber).padStart(4, "0")}` : "OFF Member" },
    likeCount: 0,
    likedByViewer: false,
    canDelete: user.role === "ADMIN" || comment.userId === user.id,
    replyCount: comment._count.replies,
    replies: comment.replies.map((reply) => ({ id: reply.id, parentId: reply.parentId, content: reply.content, createdAt: reply.createdAt.toISOString(), user: { id: reply.user.id, name: reply.user.name, offId: reply.user.memberProfile?.memberNumber ? `OFF #${String(reply.user.memberProfile.memberNumber).padStart(4, "0")}` : "OFF Member" }, likeCount: 0, likedByViewer: false, canDelete: user.role === "ADMIN" || reply.userId === user.id, replyCount: 0, replies: [] })),
  })) });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
  if (!await consumeRateLimit("gallery-comment", user.id, 8, 60_000)) return NextResponse.json({ success: false, error: "Has enviado varios comentarios. Espera un momento." }, { status: 429 });
  const { id } = await params;
  const body = await request.json().catch(() => null) as { content?: unknown; parentId?: unknown } | null;
  const content = cleanComment(body?.content);
  const requestedParentId = typeof body?.parentId === "string" ? body.parentId : null;
  if (!content) return NextResponse.json({ success: false, error: "Escribe un comentario." }, { status: 400 });
  const db = getDb();
  const post = await db.galleryPost.findFirst({ where: { id, status: "published" }, select: { id: true } });
  if (!post) return NextResponse.json({ success: false, error: "Publicación no encontrada." }, { status: 404 });
  const parent = requestedParentId ? await db.galleryPostComment.findFirst({ where: { id: requestedParentId, postId: id }, select: { id: true, parentId: true, userId: true } }) : null;
  if (requestedParentId && !parent) return NextResponse.json({ success: false, error: "El comentario al que respondes ya no existe." }, { status: 404 });
  const parentId = parent?.parentId ?? parent?.id ?? null;
  const comment = await db.galleryPostComment.create({ data: { postId: id, userId: user.id, parentId, content }, include: { user: { select: { id: true, name: true, memberProfile: { select: { memberNumber: true } } } } } });
  if (parent && parent.userId !== user.id) await db.notification.create({ data: { userId: parent.userId, type: "COMMENT_REPLY", title: "Nueva respuesta", message: `${user.name} respondió a tu comentario.`, href: `/off/post/${id}#comment-${comment.id}` } });
  return NextResponse.json({ success: true, comment: { id: comment.id, parentId: comment.parentId, content: comment.content, createdAt: comment.createdAt.toISOString(), user: { id: comment.user.id, name: comment.user.name, offId: comment.user.memberProfile?.memberNumber ? `OFF #${String(comment.user.memberProfile.memberNumber).padStart(4, "0")}` : "OFF Member" }, likeCount: 0, likedByViewer: false, canDelete: true, replyCount: 0, replies: [] } });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => null) as { commentId?: unknown } | null;
  const commentId = typeof body?.commentId === "string" ? body.commentId : "";
  const comment = commentId ? await getDb().galleryPostComment.findFirst({ where: { id: commentId, postId: id } }) : null;
  if (!comment) return NextResponse.json({ success: false, error: "Comentario no encontrado." }, { status: 404 });
  if (user.role !== "ADMIN" && comment.userId !== user.id) return NextResponse.json({ success: false, error: "No puedes eliminar este comentario." }, { status: 403 });
  await getDb().galleryPostComment.delete({ where: { id: comment.id } });
  return NextResponse.json({ success: true });
}
