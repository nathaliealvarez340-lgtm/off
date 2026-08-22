import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { cleanSocialText, COMMUNITY_POST_LIMIT, getCommunityFeed } from "@/lib/community";
import { getDb } from "@/lib/db";
import { consumeRateLimit } from "@/lib/rate-limit";

function safeImageUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
  const url = new URL(request.url);
  const tab = url.searchParams.get("tab") ?? "for-you";
  const offset = Math.max(0, Number.parseInt(url.searchParams.get("offset") ?? "0", 10) || 0);
  const data = await getCommunityFeed(user.id, user.role, tab, offset, 15);
  return NextResponse.json({ success: true, ...data });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
  if (!await consumeRateLimit("community-post", user.id, 5, 60_000)) return NextResponse.json({ success: false, error: "Espera un momento antes de publicar de nuevo." }, { status: 429 });
  const body = await request.json().catch(() => null) as { content?: unknown; imageUrl?: unknown } | null;
  const content = cleanSocialText(body?.content, COMMUNITY_POST_LIMIT);
  if (content.length < 2) return NextResponse.json({ success: false, error: "Escribe un pensamiento antes de publicar." }, { status: 400 });
  const imageUrl = safeImageUrl(body?.imageUrl);
  if (body?.imageUrl && !imageUrl) return NextResponse.json({ success: false, error: "La imagen no es válida." }, { status: 400 });
  const post = await getDb().communityPost.create({ data: { userId: user.id, content, imageUrl } });
  return NextResponse.json({ success: true, id: post.id });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
  const body = await request.json().catch(() => null) as { id?: unknown; hide?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  const post = id ? await getDb().communityPost.findUnique({ where: { id }, select: { id: true, userId: true } }) : null;
  if (!post) return NextResponse.json({ success: false, error: "Publicación no encontrada." }, { status: 404 });
  if (user.role !== "ADMIN" && post.userId !== user.id) return NextResponse.json({ success: false, error: "No puedes eliminar esta publicación." }, { status: 403 });
  if (user.role === "ADMIN" && body?.hide === true) await getDb().communityPost.update({ where: { id }, data: { status: "hidden" } });
  else await getDb().communityPost.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
