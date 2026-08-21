import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getPublishedGalleryPosts, isGalleryCategory, serializeGalleryPost } from "@/lib/gallery";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (id) {
    const post = await getDb().galleryPost.findFirst({
      where: { id, status: "published" },
      include: {
        _count: { select: { likes: true, comments: { where: { status: "PUBLISHED" } }, shares: true } },
        likes: { where: { userId: user.id }, select: { userId: true } },
      },
    });
    return NextResponse.json({ success: true, post: post ? serializeGalleryPost(post, user.id) : null }, { status: post ? 200 : 404 });
  }
  const categoryValue = searchParams.get("category");
  const category = isGalleryCategory(categoryValue) ? categoryValue : undefined;
  const offset = Math.max(Number.parseInt(searchParams.get("offset") ?? "0", 10) || 0, 0);
  const limit = Math.min(Math.max(Number.parseInt(searchParams.get("limit") ?? "16", 10) || 16, 1), 24);

  const posts = await getPublishedGalleryPosts({ category, skip: offset, take: limit + 1, viewerId: user.id });
  return NextResponse.json({
    success: true,
    posts: posts.slice(0, limit).map((post) => serializeGalleryPost(post, user.id)),
    hasMore: posts.length > limit,
  });
}
