import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { consumeRateLimit } from "@/lib/rate-limit";

function clean(value: unknown, limit: number) {
  return typeof value === "string" ? value.replace(/<[^>]*>/g, "").trim().slice(0, limit) : "";
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
  const url = new URL(request.url);
  const articleId = url.searchParams.get("articleId");
  const query = clean(url.searchParams.get("q"), 80);
  const highlights = await getDb().articleHighlight.findMany({
    where: { userId: user.id, ...(articleId ? { articleId } : {}), ...(query ? { OR: [{ selectedText: { contains: query, mode: "insensitive" } }, { note: { contains: query, mode: "insensitive" } }, { article: { title: { contains: query, mode: "insensitive" } } }] } : {}) },
    include: { article: { select: { title: true, slug: true } } }, orderBy: { updatedAt: "desc" }, take: articleId ? 200 : 80,
  });
  return NextResponse.json({ success: true, highlights: highlights.map((item) => ({ ...item, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() })) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
  if (!await consumeRateLimit("article-highlight", user.id, 30, 60_000)) return NextResponse.json({ success: false, error: "Espera un momento." }, { status: 429 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const articleId = clean(body?.articleId, 80); const selectedText = clean(body?.selectedText, 500); const blockId = clean(body?.blockId, 80);
  if (!articleId || selectedText.length < 2) return NextResponse.json({ success: false, error: "Selecciona un fragmento válido." }, { status: 400 });
  const article = await getDb().article.findFirst({ where: { id: articleId, status: "published" }, select: { id: true } });
  if (!article) return NextResponse.json({ success: false, error: "Artículo no encontrado." }, { status: 404 });
  const highlight = await getDb().articleHighlight.create({ data: { userId: user.id, articleId, selectedText, blockId: blockId || null, startOffset: Number.isInteger(body?.startOffset) ? Number(body?.startOffset) : null, endOffset: Number.isInteger(body?.endOffset) ? Number(body?.endOffset) : null, prefix: clean(body?.prefix, 80) || null, suffix: clean(body?.suffix, 80) || null, note: clean(body?.note, 1000) || null } });
  return NextResponse.json({ success: true, highlight });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const id = clean(body?.id, 80); const note = clean(body?.note, 1000);
  const result = await getDb().articleHighlight.updateMany({ where: { id, userId: user.id }, data: { note: note || null } });
  return NextResponse.json({ success: result.count === 1 }, { status: result.count === 1 ? 200 : 404 });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false }, { status: 401 });
  const body = await request.json().catch(() => null) as { id?: unknown } | null;
  const result = await getDb().articleHighlight.deleteMany({ where: { id: clean(body?.id, 80), userId: user.id } });
  return NextResponse.json({ success: result.count === 1 }, { status: result.count === 1 ? 200 : 404 });
}
