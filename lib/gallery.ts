import type { GalleryCategory, GalleryMediaType, GalleryMusicSource, GalleryPost, Prisma } from "@prisma/client";
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
  mediaTransform: GalleryMediaTransform;
  audioUrl: string | null;
  audioTitle: string | null;
  audioArtist: string | null;
  musicSource: GalleryMusicSource | null;
  spotifyUrl: string | null;
  spotifyTrackId: string | null;
  publishedAt: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  likedByViewer: boolean;
  permalink: string;
};

export type GalleryMediaTransform = {
  x: number;
  y: number;
  zoom: number;
  rotation: number;
  flipX: boolean;
  flipY: boolean;
};

export const DEFAULT_GALLERY_TRANSFORM: GalleryMediaTransform = { x: 50, y: 50, zoom: 1, rotation: 0, flipX: false, flipY: false };

type GalleryPostRecord = GalleryPost & {
  _count?: { likes: number; comments: number; shares: number };
  likes?: Array<{ userId: string }>;
};

export function isGalleryCategory(value: string | null): value is GalleryCategory {
  return Boolean(value && GALLERY_CATEGORIES.includes(value as GalleryCategory));
}

export function normalizeGalleryTransform(value: Prisma.JsonValue | null | undefined): GalleryMediaTransform {
  if (!value || typeof value !== "object" || Array.isArray(value)) return DEFAULT_GALLERY_TRANSFORM;
  const item = value as Record<string, unknown>;
  return {
    x: Math.min(100, Math.max(0, Number(item.x) || 50)),
    y: Math.min(100, Math.max(0, Number(item.y) || 50)),
    zoom: Math.min(3, Math.max(1, Number(item.zoom) || 1)),
    rotation: [0, 90, 180, 270].includes(Number(item.rotation)) ? Number(item.rotation) : 0,
    flipX: item.flipX === true,
    flipY: item.flipY === true,
  };
}

export function serializeGalleryPost(post: GalleryPostRecord, viewerId?: string): GalleryPostData {
  return {
    id: post.id,
    mediaType: post.mediaType,
    mediaUrl: post.mediaUrl,
    thumbnailUrl: post.thumbnailUrl,
    title: post.title,
    caption: post.caption,
    altText: post.altText,
    category: post.category,
    mediaTransform: normalizeGalleryTransform(post.mediaTransform),
    audioUrl: post.audioUrl,
    audioTitle: post.audioTitle,
    audioArtist: post.audioArtist,
    musicSource: post.musicSource ?? (post.audioUrl ? "UPLOAD" : post.spotifyTrackId ? "SPOTIFY" : null),
    spotifyUrl: post.spotifyUrl,
    spotifyTrackId: post.spotifyTrackId,
    publishedAt: (post.publishedAt ?? post.updatedAt).toISOString(),
    likeCount: post._count?.likes ?? 0,
    commentCount: post._count?.comments ?? 0,
    shareCount: post._count?.shares ?? 0,
    likedByViewer: Boolean(viewerId && post.likes?.some((like) => like.userId === viewerId)),
    permalink: `/off/post/${post.id}`,
  };
}

export async function getPublishedGalleryPosts({
  category,
  skip = 0,
  take = 16,
  viewerId,
}: {
  category?: GalleryCategory;
  skip?: number;
  take?: number;
  viewerId?: string;
} = {}) {
  const safeTake = Math.min(Math.max(take, 1), 24);
  return getDb().galleryPost.findMany({
    where: { status: "published", ...(category ? { category } : {}) },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    skip: Math.max(skip, 0),
    take: safeTake,
    include: {
      _count: { select: { likes: true, comments: { where: { status: "PUBLISHED" } }, shares: true } },
      likes: viewerId ? { where: { userId: viewerId }, select: { userId: true } } : false,
    },
  });
}
