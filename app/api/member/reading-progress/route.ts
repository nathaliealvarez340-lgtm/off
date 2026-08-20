import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "USER") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json() as { articleId?: string; progress?: number; lastPosition?: number };
    const articleId = body.articleId?.trim();
    const progress = Math.min(100, Math.max(0, Number(body.progress) || 0));
    const lastPosition = Math.max(0, Math.round(Number(body.lastPosition) || 0));

    if (!articleId) {
      return NextResponse.json({ success: false, error: "Missing article" }, { status: 400 });
    }

    const article = await getDb().article.findFirst({
      where: { id: articleId, status: "published" },
      select: { id: true },
    });
    if (!article) {
      return NextResponse.json({ success: false, error: "Article not found" }, { status: 404 });
    }

    await getDb().articleReadingProgress.upsert({
      where: { userId_articleId: { userId: user.id, articleId } },
      create: { userId: user.id, articleId, progress, lastPosition },
      update: { progress, lastPosition },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Unable to save progress" }, { status: 400 });
  }
}
