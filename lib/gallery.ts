import type { GalleryCategory, GalleryMediaType, GalleryPost } from "@prisma/client";
import { getDb } from "@/lib/db";

export const GALLERY_CATEGORIES = ["EXPLORE", "CONFESSIONS", "PEOPLE", "START_HERE", "TWENTIES"] as const;

export const GALLERY_CATEGORY_LABELS: Record<GalleryCategory, string> = {
  EXPLORE: "Explorar",
  CONFESSIONS: "Confessions",
  PEOPLE: "People",
  START_HERE: "Start Here",
  TWENTIES: "20s",
};

export type GalleryPostData = {
  id: string;
  mediaType: GalleryMediaType;
  mediaUrl: string;
  thumbnailUrl: string | null;
  title: string | null;
  caption: string | null;
  altText: string | null;
  category: GalleryCategory;
  publishedAt: string;
};

export function isGalleryCategory(value: string | null): value is GalleryCategory {
  return Boolean(value && GALLERY_CATEGORIES.includes(value as GalleryCategory));
}

export function serializeGalleryPost(post: GalleryPost): GalleryPostData {
  return {
    id: post.id,
    mediaType: post.mediaType,
    mediaUrl: post.mediaUrl,
    thumbnailUrl: post.thumbnailUrl,
    title: post.title,
    caption: post.caption,
    altText: post.altText,
    category: post.category,
    publishedAt: (post.publishedAt ?? post.updatedAt).toISOString(),
  };
}

export async function getPublishedGalleryPosts({
  category,
  skip = 0,
  take = 16,
}: {
  category?: GalleryCategory;
  skip?: number;
  take?: number;
} = {}) {
  const safeTake = Math.min(Math.max(take, 1), 24);
  return getDb().galleryPost.findMany({
    where: { status: "published", ...(category ? { category } : {}) },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    skip: Math.max(skip, 0),
    take: safeTake,
  });
}
