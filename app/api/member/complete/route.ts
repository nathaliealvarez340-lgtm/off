import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { completionMessage, earnedBadges } from "@/lib/member-progress";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "USER") return NextResponse.json({ ok: false }, { status: 401 });

  const body = await request.json().catch(() => null) as { articleId?: unknown } | null;
  const articleId = typeof body?.articleId === "string" ? body.articleId : "";
  const article = articleId ? await getDb().article.findFirst({ where: { id: articleId, status: "published" } }) : null;
  if (!article) return NextResponse.json({ ok: false, error: "No encontramos este artículo." }, { status: 404 });

  await getDb().articleCompletion.upsert({
    where: { userId_articleId: { userId: user.id, articleId } },
    update: {},
    create: { userId: user.id, articleId },
  });
  const completedCount = await getDb().articleCompletion.count({ where: { userId: user.id } });

  return NextResponse.json({
    ok: true,
    completedCount,
    badges: earnedBadges(completedCount),
    message: completionMessage(article.category),
  });
}
