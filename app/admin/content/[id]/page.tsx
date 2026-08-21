import { notFound } from "next/navigation";
import { GalleryPostEditor } from "@/components/GalleryPostEditor";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";

export default async function EditContentPostPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const post = await getDb().galleryPost.findUnique({ where: { id } });
  if (!post) notFound();
  return <GalleryPostEditor post={post} />;
}
