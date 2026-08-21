import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { consumeRateLimit } from "@/lib/rate-limit";

function cleanComment(value: unknown) {
  return typeof value === "string" ? value.replace(/<[^>]*>/g, "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, 1000) : "";
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
  const { id } = await params;
  const comments = await getDb().galleryPostComment.findMany({
    where: { postId: id, status: "PUBLISHED", post: { status: "published" } },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  return NextResponse.json({ success: true, comments: comments.map((comment) => ({ id: comment.id, content: comment.content, createdAt: comment.createdAt.toISOString(), name: comment.user.name, canDelete: user.role === "ADMIN" || comment.userId === user.id })) });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
  if (!await consumeRateLimit("gallery-comment", user.id, 8, 60_000)) return NextResponse.json({ success: false, error: "Has enviado varios comentarios. Espera un momento." }, { status: 429 });
  const { id } = await params;
  const body = await request.json().catch(() => null) as { content?: unknown } | null;
  const content = cleanComment(body?.content);
  if (!content) return NextResponse.json({ success: false, error: "Escribe un comentario." }, { status: 400 });
  const db = getDb();
  const post = await db.galleryPost.findFirst({ where: { id, status: "published" }, select: { id: true } });
  if (!post) return NextResponse.json({ success: false, error: "Publicación no encontrada." }, { status: 404 });
  const comment = await db.galleryPostComment.create({ data: { postId: id, userId: user.id, content }, include: { user: { select: { name: true } } } });
  return NextResponse.json({ success: true, comment: { id: comment.id, content: comment.content, createdAt: comment.createdAt.toISOString(), name: comment.user.name, canDelete: true } });
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
