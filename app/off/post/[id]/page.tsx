import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { GalleryPostViewer } from "@/components/GalleryPostViewer";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { serializeGalleryPost } from "@/lib/gallery";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const post = await getDb().galleryPost.findFirst({ where: { id, status: "published" }, select: { title: true, caption: true, mediaType: true, mediaUrl: true, thumbnailUrl: true } });
  if (!post) return { title: "Publicación no disponible | OFF", robots: { index: false } };
  const title = post.title || "Publicación visual de OFF";
  const description = post.caption?.slice(0, 180) || "Una publicación visual dentro de OFF.";
  const image = post.thumbnailUrl || (post.mediaType === "IMAGE" ? post.mediaUrl : undefined);
  return { title: `${title} | OFF`, description, robots: { index: false, follow: false }, openGraph: { title, description, images: image ? [image] : undefined } };
}

export default async function GalleryPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/off/post/${id}`)}`);
  const post = await getDb().galleryPost.findFirst({
    where: { id, status: "published" },
    include: { _count: { select: { likes: true, comments: { where: { status: "PUBLISHED" } }, shares: true } }, likes: { where: { userId: user.id }, select: { userId: true } } },
  });
  if (!post) notFound();
  return <main className="gallery-post-page"><GalleryPostViewer post={serializeGalleryPost(post, user.id)} initialLanguage={user.preferredLanguage === "en" || user.preferredLanguage === "it" || user.preferredLanguage === "pt" ? user.preferredLanguage : "es"} standalone /></main>;
}
