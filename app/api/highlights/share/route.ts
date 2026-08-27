import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { consumeRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false }, { status: 401 });
  if (!await consumeRateLimit("highlight-share", user.id, 5, 60_000)) return NextResponse.json({ success: false, error: "Espera un momento." }, { status: 429 });
  const body = await request.json().catch(() => null) as { id?: unknown; comment?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  const highlight = await getDb().articleHighlight.findFirst({ where: { id, userId: user.id }, include: { article: { select: { title: true, slug: true } } } });
  if (!highlight) return NextResponse.json({ success: false }, { status: 404 });
  const comment = typeof body?.comment === "string" ? body.comment.replace(/<[^>]*>/g, "").trim().slice(0, 400) : "";
  const quote = highlight.selectedText.slice(0, 320);
  await getDb().communityPost.create({ data: { userId: user.id, content: `${comment ? `${comment}\n\n` : ""}“${quote}”\n\n${highlight.article.title}\n/off/${highlight.article.slug}` } });
  return NextResponse.json({ success: true });
}
